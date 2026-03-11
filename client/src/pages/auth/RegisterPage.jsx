import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';

const T = {
  navy:'#050D1F',navyMid:'#0B1730',surface:'#0F1E38',surfaceAlt:'#122040',
  teal:'#00C6FF',cyan:'#00FFD1',gradient:'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  white:'#FFFFFF',slate:'#8DA5C4',muted:'#4A6080',
  border:'rgba(0,198,255,0.12)',borderH:'rgba(0,198,255,0.32)',
  error:'rgba(239,68,68,0.12)',errorText:'#F87171',
  success:'rgba(16,217,136,0.12)',successText:'#10D988',
};

const DEPARTMENTS = ['IT','HR','Finance','Operations','Marketing','Legal','Sales','Engineering'];

const PasswordStrength = ({ password }) => {
  const checks = [
    { label:'8+ characters', ok: password.length >= 8 },
    { label:'Uppercase',      ok: /[A-Z]/.test(password) },
    { label:'Number',         ok: /[0-9]/.test(password) },
    { label:'Special char',   ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c=>c.ok).length;
  const colors = ['#EF4444','#F59E0B','#F59E0B','#10D988','#10D988'];
  const labels = ['','Weak','Fair','Good','Strong'];

  if(!password) return null;
  return (
    <div style={{marginTop:'.6rem'}}>
      <div style={{display:'flex',gap:'4px',marginBottom:'.3rem'}}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{
            flex:1,height:'3px',borderRadius:'2px',
            background: i<=score ? colors[score] : T.border,
            transition:'background .3s',
          }}/>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:'.72rem',color:score>0?colors[score]:T.muted,fontWeight:'600'}}>
          {labels[score] || ''}
        </span>
        <div style={{display:'flex',gap:'.75rem'}}>
          {checks.map(c=>(
            <span key={c.label} style={{
              fontSize:'.68rem',
              color:c.ok ? T.cyan : T.muted,
              display:'flex',alignItems:'center',gap:'2px',
            }}>
              <span style={{fontSize:'.65rem'}}>{c.ok?'✓':'○'}</span> {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName:'', email:'', department:'', jobTitle:'', password:'',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [step,    setStep]    = useState(1); // 2-step form

  const handleChange = (e) => setFormData({...formData,[e.target.name]:e.target.value});

  const handleNext = (e) => {
    e.preventDefault();
    if(!formData.fullName || !formData.email) return;
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/register', formData);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name) => ({
    width:'100%',padding:'.8rem 1rem',
    background:focused===name ? T.surfaceAlt : T.surface,
    border:`1px solid ${focused===name ? T.teal : T.border}`,
    color:T.white,borderRadius:'10px',
    fontSize:'.93rem',outline:'none',boxSizing:'border-box',
    fontFamily:"'DM Sans',sans-serif",
    transition:'all .2s ease',
    boxShadow: focused===name ? '0 0 0 3px rgba(0,198,255,.1)' : 'none',
  });

  const labelStyle = {
    display:'block',fontSize:'.82rem',fontWeight:'600',
    color:T.slate,marginBottom:'.4rem',letterSpacing:'.02em',
  };

  return (
    <div style={{
      minHeight:'calc(100vh - 64px)',
      display:'flex',alignItems:'stretch',
      fontFamily:"'DM Sans',sans-serif",
    }}>
      {/* Left panel */}
      <div style={{
        flex:1,background:T.navyMid,
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:'3rem',position:'relative',overflow:'hidden',
      }} className="reg-left-panel">
        <div style={{
          position:'absolute',inset:0,
          backgroundImage:`linear-gradient(rgba(0,198,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,198,255,.04) 1px,transparent 1px)`,
          backgroundSize:'50px 50px',pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          width:'500px',height:'500px',borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,255,209,.07) 0%,transparent 65%)',
          pointerEvents:'none',
        }}/>

        <div style={{position:'relative',zIndex:1,textAlign:'center',maxWidth:'400px'}}>
          <div style={{
            width:'72px',height:'72px',borderRadius:'20px',
            background:T.gradient,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.8rem',
            color:T.navy,margin:'0 auto 1.75rem',
            boxShadow:'0 0 40px rgba(0,198,255,.4)',
          }}>S</div>

          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'1.9rem',fontWeight:'800',letterSpacing:'-.03em',marginBottom:'.6rem'}}>
            Join <span style={{background:T.gradient,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Sentinel</span>
          </h2>
          <p style={{color:T.slate,lineHeight:1.7,fontSize:'.93rem',marginBottom:'2.5rem'}}>
            Set up your account and start managing ERP access in minutes.
          </p>

          {/* Steps indicator */}
          <div style={{marginBottom:'2rem'}}>
            {[
              {num:1,label:'Personal Info'},
              {num:2,label:'Role & Security'},
            ].map((s,i)=>(
              <div key={s.num} style={{
                display:'flex',alignItems:'center',gap:'1rem',
                padding:'.75rem 1rem',
                background: step===s.num ? 'rgba(0,198,255,.1)' : 'transparent',
                border: `1px solid ${step===s.num ? T.borderH : T.border}`,
                borderRadius:'10px',marginBottom:'.5rem',
                transition:'all .3s ease',
              }}>
                <div style={{
                  width:'28px',height:'28px',borderRadius:'50%',
                  background: step>s.num ? T.gradient : step===s.num ? T.gradient : 'transparent',
                  border: step===s.num||step>s.num ? 'none' : `1px solid ${T.border}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'.75rem',fontWeight:'700',
                  color: step>=s.num ? T.navy : T.muted,
                  minWidth:'28px',
                }}>
                  {step>s.num ? '✓' : s.num}
                </div>
                <span style={{
                  fontSize:'.85rem',fontWeight:'500',
                  color: step===s.num ? T.white : T.muted,
                }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{
            background:'rgba(0,198,255,.06)',border:`1px solid ${T.border}`,
            borderRadius:'10px',padding:'1rem',
          }}>
            <p style={{fontSize:'.8rem',color:T.slate,lineHeight:1.6}}>
              🔐 Your data is encrypted end-to-end.<br/>
              Accounts start with Employee role by default.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width:'100%',maxWidth:'480px',
        background:T.navy,
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:'3rem 2.5rem',
        overflowY:'auto',
      }}>
        <div style={{width:'100%',maxWidth:'400px'}}>

          {/* Header */}
          <div style={{marginBottom:'2rem'}}>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:'.5rem',
              background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,
              color:T.teal,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',
              textTransform:'uppercase',padding:'.3rem .8rem',borderRadius:'100px',
              marginBottom:'1rem',
            }}>Step {step} of 2</div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:'1.5rem',fontWeight:'800',letterSpacing:'-.03em',marginBottom:'.3rem'}}>
              {step===1 ? 'Personal Info' : 'Role & Security'}
            </h3>
            <p style={{color:T.slate,fontSize:'.88rem'}}>
              {step===1 ? 'Tell us about yourself' : 'Almost there — just two more fields'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background:T.error,border:'1px solid rgba(239,68,68,.3)',
              color:T.errorText,padding:'.85rem 1rem',borderRadius:'10px',
              marginBottom:'1.25rem',fontSize:'.87rem',
              display:'flex',alignItems:'center',gap:'.5rem',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Step 1 */}
          {step===1 && (
            <form onSubmit={handleNext}>
              <div style={{marginBottom:'1.1rem'}}>
                <label style={labelStyle}>Full Name</label>
                <input name="fullName" type="text" value={formData.fullName}
                  onChange={handleChange}
                  onFocus={()=>setFocused('fullName')}
                  onBlur={()=>setFocused('')}
                  placeholder="Jane Smith" required
                  style={inputStyle('fullName')}/>
              </div>
              <div style={{marginBottom:'1.75rem'}}>
                <label style={labelStyle}>Email Address</label>
                <input name="email" type="email" value={formData.email}
                  onChange={handleChange}
                  onFocus={()=>setFocused('email')}
                  onBlur={()=>setFocused('')}
                  placeholder="you@company.com" required
                  style={inputStyle('email')}/>
              </div>
              <button type="submit" style={{
                width:'100%',padding:'.9rem',
                background:T.gradient,color:T.navy,border:'none',borderRadius:'10px',
                fontFamily:"'DM Sans',sans-serif",fontSize:'1rem',fontWeight:'700',
                cursor:'pointer',boxShadow:'0 4px 20px rgba(0,198,255,.3)',
              }}>
                Continue →
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step===2 && (
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom:'1.1rem'}}>
                <label style={labelStyle}>Department</label>
                <select name="department" value={formData.department}
                  onChange={handleChange}
                  onFocus={()=>setFocused('department')}
                  onBlur={()=>setFocused('')}
                  required style={inputStyle('department')}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{marginBottom:'1.1rem'}}>
                <label style={labelStyle}>Job Title</label>
                <input name="jobTitle" type="text" value={formData.jobTitle}
                  onChange={handleChange}
                  onFocus={()=>setFocused('jobTitle')}
                  onBlur={()=>setFocused('')}
                  placeholder="e.g. Software Engineer" required
                  style={inputStyle('jobTitle')}/>
              </div>
              <div style={{marginBottom:'1.75rem'}}>
                <label style={labelStyle}>Password</label>
                <div style={{position:'relative'}}>
                  <input name="password" type={showPw?'text':'password'} value={formData.password}
                    onChange={handleChange}
                    onFocus={()=>setFocused('password')}
                    onBlur={()=>setFocused('')}
                    placeholder="Create a strong password" required minLength={6}
                    style={{...inputStyle('password'),paddingRight:'2.75rem'}}/>
                  <button type="button" onClick={()=>setShowPw(s=>!s)} style={{
                    position:'absolute',right:'.9rem',top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'1rem',
                  }}>{showPw?'🙈':'👁'}</button>
                </div>
                <PasswordStrength password={formData.password}/>
              </div>

              <div style={{display:'flex',gap:'.75rem'}}>
                <button type="button" onClick={()=>setStep(1)} style={{
                  flex:1,padding:'.9rem',
                  background:'transparent',border:`1.5px solid ${T.border}`,
                  color:T.slate,borderRadius:'10px',
                  fontFamily:"'DM Sans',sans-serif",fontSize:'1rem',fontWeight:'600',
                  cursor:'pointer',transition:'all .2s',
                }}>
                  ← Back
                </button>
                <button type="submit" disabled={loading} style={{
                  flex:2,padding:'.9rem',
                  background: loading?'rgba(0,198,255,.3)':T.gradient,
                  color:T.navy,border:'none',borderRadius:'10px',
                  fontFamily:"'DM Sans',sans-serif",fontSize:'1rem',fontWeight:'700',
                  cursor:loading?'not-allowed':'pointer',
                  boxShadow:loading?'none':'0 4px 20px rgba(0,198,255,.3)',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',
                }}>
                  {loading && (
                    <span style={{
                      width:'14px',height:'14px',border:'2px solid rgba(5,13,31,.3)',
                      borderTopColor:T.navy,borderRadius:'50%',
                      display:'inline-block',animation:'spin 1s linear infinite',
                    }}/>
                  )}
                  {loading ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p style={{textAlign:'center',marginTop:'1.75rem',fontSize:'.88rem',color:T.slate}}>
            Already have an account?{' '}
            <Link to="/login" style={{color:T.teal,textDecoration:'none',fontWeight:'600'}}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder,textarea::placeholder{color:#4A6080;}
        select option{background:#0F1E38;}
        @media(max-width:768px){.reg-left-panel{display:none!important;}}
      `}</style>
    </div>
  );
};

export default RegisterPage;