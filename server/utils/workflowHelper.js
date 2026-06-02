/** * Pure helper functions for the workflow system.
 * No DB calls here — keeps services testable.
 */

// ── Condition Evaluation ──────────────────────────────────────────────────────

/**
 * Evaluate a single leaf condition against a data object.
 * Supported operators: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN,
 *                      CONTAINS, NOT_CONTAINS, IN, NOT_IN
 *
 * @param {{ field, operator, value }} condition
 * @param {Object} data  - flat object of request attributes
 * @returns {boolean}
 */
function evaluateLeafCondition(condition, data) {
  const { field, operator, value } = condition;
  const actual = data[field];

  switch (operator) {
    case 'EQUALS':       return String(actual).toLowerCase() === String(value).toLowerCase();
    case 'NOT_EQUALS':   return String(actual).toLowerCase() !== String(value).toLowerCase();
    case 'GREATER_THAN': return Number(actual) > Number(value);
    case 'LESS_THAN':    return Number(actual) < Number(value);
    case 'CONTAINS':     return String(actual).toLowerCase().includes(String(value).toLowerCase());
    case 'NOT_CONTAINS': return !String(actual).toLowerCase().includes(String(value).toLowerCase());
    case 'IN':           return Array.isArray(value) && value.map(v => String(v).toLowerCase()).includes(String(actual).toLowerCase());
    case 'NOT_IN':       return Array.isArray(value) && !value.map(v => String(v).toLowerCase()).includes(String(actual).toLowerCase());
    default:             return false;
  }
}

/**
 * Recursively evaluate a condition tree.
 *
 * Condition tree shape:
 *   Leaf:     { field, operator, value }
 *   Compound: { logicalOperator: 'AND'|'OR', conditions: [...] }
 *
 * @param {Object} conditionNode
 * @param {Object} data
 * @returns {boolean}
 */
function evaluateConditionLogic(conditionNode, data) {
  if (!conditionNode) return true; // no condition = always match

  const { logicalOperator, conditions, field } = conditionNode;

  // Leaf node
  if (field !== undefined) {
    return evaluateLeafCondition(conditionNode, data);
  }

  // Compound node
  if (!Array.isArray(conditions) || conditions.length === 0) return true;

  if (logicalOperator === 'OR') {
    return conditions.some(c => evaluateConditionLogic(c, data));
  }
  // Default AND
  return conditions.every(c => evaluateConditionLogic(c, data));
}

/**
 * Validate the shape of a rule condition object (lightweight schema check).
 * Returns { valid: Boolean, errors: String[] }
 */
function validateRuleCondition(condition) {
  const errors = [];

  function check(node, depth = 0) {
    if (!node || typeof node !== 'object') {
      errors.push('Condition must be an object');
      return;
    }

    if (node.field !== undefined) {
      // Leaf node
      if (!node.operator) errors.push(`Missing operator in leaf at depth ${depth}`);
      if (node.value === undefined) errors.push(`Missing value in leaf at depth ${depth}`);
    } else if (node.logicalOperator !== undefined) {
      // Compound node
      if (!['AND', 'OR'].includes(node.logicalOperator))
        errors.push(`logicalOperator must be AND or OR (got: ${node.logicalOperator})`);
      if (!Array.isArray(node.conditions) || node.conditions.length === 0)
        errors.push('Compound condition must have at least one child condition');
      else node.conditions.forEach(c => check(c, depth + 1));
    } else {
      errors.push(`Unrecognised condition node at depth ${depth}: ${JSON.stringify(node)}`);
    }
  }

  check(condition);
  return { valid: errors.length === 0, errors };
}

// ── SLA Helpers ───────────────────────────────────────────────────────────────

/**
 * Calculate SLA deadline from a start time + slaHours.
 * Skips weekends (Saturday/Sunday) — business hours only.
 *
 * @param {Date}   startTime
 * @param {number} slaHours  - working hours
 * @returns {Date}
 */
function calculateSLADeadline(startTime, slaHours) {
  let remaining = slaHours;
  const WORK_START = 9;  // 09:00
  const WORK_END   = 18; // 18:00
  const WORK_HOURS_PER_DAY = WORK_END - WORK_START;

  let cursor = new Date(startTime);

  // Fast path: if no business-hour rounding needed (slaHours ≤ 0)
  if (slaHours <= 0) return cursor;

  // Advance past weekends for initial position
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(WORK_START, 0, 0, 0);
  }

  while (remaining > 0) {
    const day = cursor.getDay();
    // Skip weekends
    if (day === 0 || day === 6) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(WORK_START, 0, 0, 0);
      continue;
    }

    const endOfDay = new Date(cursor);
    endOfDay.setHours(WORK_END, 0, 0, 0);

    const hoursLeftToday = Math.max(0, (endOfDay - cursor) / 3600000);

    if (remaining <= hoursLeftToday) {
      cursor = new Date(cursor.getTime() + remaining * 3600000);
      remaining = 0;
    } else {
      remaining -= hoursLeftToday;
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(WORK_START, 0, 0, 0);
    }
  }

  return cursor;
}

/**
 * Check whether an SLA deadline has been breached.
 * @param {Date} deadline
 * @returns {{ isBreached: boolean, hoursOverdue: number }}
 */
function checkSLABreach(deadline) {
  if (!deadline) return { isBreached: false, hoursOverdue: 0 };
  const now = new Date();
  const isBreached = now > deadline;
  const hoursOverdue = isBreached ? Math.round((now - deadline) / 3600000) : 0;
  return { isBreached, hoursOverdue };
}

// ── Format helpers ────────────────────────────────────────────────────────────

/**
 * Build a tidy workflow response object from populated Mongoose docs.
 */
function formatWorkflowResponse(workflow) {
  if (!workflow) return null;
  const obj = workflow.toObject ? workflow.toObject() : { ...workflow };
  return {
    ...obj,
    layerCount: (obj.approvalLayers || []).length,
  };
}

/**
 * Build a request-level approval path summary — one entry per layer.
 * Sorted by layerLevel ascending.
 *
 * @param {Object[]} layerStatuses - from AccessRequest.layerStatuses
 * @param {Object}   currentLayer  - populated ApprovalLayer doc or null
 * @returns {Object[]}
 */
function generateApprovalPath(layerStatuses, currentLayer) {
  return (layerStatuses || [])
    .slice()
    .sort((a, b) => a.layerLevel - b.layerLevel)
    .map(ls => ({
      layerId:      ls.layerId,
      layerName:    ls.layerName,
      layerLevel:   ls.layerLevel,
      status:       ls.status,
      approvedBy:   ls.approvedBy,
      approvalDate: ls.approvalDate,
      comments:     ls.comments,
      slaDeadline:  ls.slaDeadline,
      slaBreached:  ls.slaBreached,
      isCurrent:    currentLayer
        ? String(ls.layerId) === String(currentLayer._id || currentLayer)
        : false,
    }));
}

/**
 * Extract plain attributes from an AccessRequest for rule evaluation.
 * @param {Object} request - plain object (not a Mongoose doc)
 * @returns {Object}
 */
function extractRequestAttributes(request) {
  return {
    department:    request.department    || '',
    jobTitle:      request.jobTitle      || '',
    requestedRole: request.requestedRole || '',
    riskLevel:     request.riskLevel     || 'low',
    accessDuration:request.accessDuration|| 'Permanent',
    // computed fields
    isHighRisk:    request.riskLevel === 'high',
    isPermanent:   request.accessDuration === 'Permanent',
  };
}

module.exports = {
  evaluateConditionLogic,
  validateRuleCondition,
  calculateSLADeadline,
  checkSLABreach,
  formatWorkflowResponse,
  generateApprovalPath,
  extractRequestAttributes,
};