import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";

/*                           ─ DESIGN TOKENS                           ─ */
const T = {
  navy:    "#050D1F",
  navyMid: "#0B1730",
  navyCard:"#0F1E38",
  teal:    "#00C6FF",
  cyan:    "#00FFD1",
  accent:  "linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)",
  accentR: "linear-gradient(135deg,#00FFD1 0%,#00C6FF 100%)",
  white:   "#FFFFFF",
  slate:   "#8DA5C4",
  border:  "rgba(0,198,255,0.12)",
  borderH: "rgba(0,198,255,0.35)",
  glass:   "rgba(11,23,48,0.72)",
  shadow:  "0 8px 40px rgba(0,198,255,0.10)",
  shadowH: "0 16px 60px rgba(0,198,255,0.22)",
};

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";

/*                           ─ GLOBAL STYLES                           ─ */
const GlobalStyles = () => (
  <style>{`
    @import url('${FONT_URL}');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{
      font-family:'DM Sans',sans-serif;
      background:${T.navy};
      color:${T.white};
      overflow-x:hidden;
    }
    ::selection{background:${T.teal};color:${T.navy};}
    ::-webkit-scrollbar{width:6px;}
    ::-webkit-scrollbar-track{background:${T.navy};}
    ::-webkit-scrollbar-thumb{background:${T.teal};border-radius:3px;}

    /* Utility animations */
    @keyframes fadeUp{from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:translateY(0);}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes pulse{0%,100%{opacity:.6;}50%{opacity:1;}}
    @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
    @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
    @keyframes gridMove{0%{transform:translateY(0);}100%{transform:translateY(60px);}}
    @keyframes borderGlow{0%,100%{box-shadow:0 0 8px rgba(0,198,255,.3);}50%{box-shadow:0 0 24px rgba(0,255,209,.5);}}
    @keyframes countUp{from{opacity:0;transform:scale(.8);}to{opacity:1;transform:scale(1);}}

    .hero-animate{animation:fadeUp .8s ease forwards;}
    .hero-animate-2{animation:fadeUp .9s .15s ease forwards;opacity:0;}
    .hero-animate-3{animation:fadeUp .9s .3s ease forwards;opacity:0;}
    .hero-animate-4{animation:fadeUp .9s .45s ease forwards;opacity:0;}
    .float-el{animation:float 4s ease-in-out infinite;}
    .pulse-el{animation:pulse 2s ease-in-out infinite;}

    .gradient-text{
      background:${T.accent};
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      background-clip:text;
    }
    .gradient-border{
      border:1px solid transparent;
      background-clip:padding-box;
      position:relative;
    }
    .gradient-border::before{
      content:'';position:absolute;inset:-1px;
      border-radius:inherit;
      background:${T.accent};
      z-index:-1;
    }

    .card-hover{
      transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease;
    }
    .card-hover:hover{
      transform:translateY(-6px);
      box-shadow:${T.shadowH};
    }
    .btn-primary{
      background:${T.accent};
      border:none;color:${T.navy};
      font-family:'DM Sans',sans-serif;
      font-weight:700;font-size:.95rem;
      padding:.85rem 2rem;border-radius:10px;
      cursor:pointer;
      transition:transform .2s ease,box-shadow .2s ease,filter .2s ease;
      letter-spacing:.02em;
      position:relative;overflow:hidden;
    }
    .btn-primary::after{
      content:'';position:absolute;
      top:0;left:-100%;width:100%;height:100%;
      background:rgba(255,255,255,.2);
      transform:skewX(-20deg);
      transition:left .4s ease;
    }
    .btn-primary:hover{
      transform:translateY(-2px);
      box-shadow:0 8px 30px rgba(0,198,255,.4);
      filter:brightness(1.08);
    }
    .btn-primary:hover::after{left:120%;}
    .btn-secondary{
      background:transparent;
      border:1.5px solid ${T.teal};
      color:${T.teal};
      font-family:'DM Sans',sans-serif;
      font-weight:600;font-size:.95rem;
      padding:.82rem 2rem;border-radius:10px;
      cursor:pointer;
      transition:all .25s ease;
      letter-spacing:.02em;
    }
    .btn-secondary:hover{
      background:rgba(0,198,255,.1);
      box-shadow:0 0 20px rgba(0,198,255,.25);
    }

    .section-tag{
      display:inline-flex;align-items:center;gap:.5rem;
      background:rgba(0,198,255,.1);
      border:1px solid rgba(0,198,255,.2);
      color:${T.teal};
      font-size:.75rem;font-weight:600;
      letter-spacing:.12em;text-transform:uppercase;
      padding:.35rem .9rem;border-radius:100px;
      margin-bottom:1.25rem;
    }

    .nav-link{
      color:${T.slate};font-size:.9rem;font-weight:500;
      text-decoration:none;
      transition:color .2s ease;
      cursor:pointer;
    }
    .nav-link:hover{color:${T.white};}

    .faq-item{
      border-bottom:1px solid ${T.border};
      transition:border-color .3s ease;
    }
    .faq-item:hover{border-color:${T.borderH};}

    @media(max-width:768px){
      .hide-mobile{display:none!important;}
      .stack-mobile{flex-direction:column!important;}
      .full-mobile{width:100%!important;min-width:unset!important;}
    }
  `}</style>
);

/*                           ─ GRID BACKGROUND                           ─ */
const GridBg = () => (
  <div style={{
    position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0,
  }}>
    {/* Grid lines */}
    <div style={{
      position:"absolute",inset:0,
      backgroundImage:`
        linear-gradient(rgba(0,198,255,.04) 1px,transparent 1px),
        linear-gradient(90deg,rgba(0,198,255,.04) 1px,transparent 1px)
      `,
      backgroundSize:"60px 60px",
      animation:"gridMove 8s linear infinite",
    }}/>
    {/* Radial glow */}
    <div style={{
      position:"absolute",top:"-20%",left:"50%",
      transform:"translateX(-50%)",
      width:"900px",height:"700px",
      background:"radial-gradient(ellipse,rgba(0,198,255,.12) 0%,transparent 70%)",
    }}/>
    <div style={{
      position:"absolute",bottom:"-10%",right:"-10%",
      width:"500px",height:"500px",
      background:"radial-gradient(ellipse,rgba(0,255,209,.07) 0%,transparent 65%)",
    }}/>
  </div>
);

/*                           ─ NAVBAR                           ─ */
// const Navbar = () => {
//   const [scrolled, setScrolled] = useState(false);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [active, setActive]     = useState("Home");

//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 40);
//     window.addEventListener("scroll", onScroll);
//     return () => window.removeEventListener("scroll", onScroll);
//   }, []);

//   const links = ["Home","Features","How It Works","Roles","Security","FAQ"];

//   const scrollTo = (id) => {
//     const el = document.getElementById(id.toLowerCase().replace(/\s+/g,"-"));
//     if(el) el.scrollIntoView({behavior:"smooth"});
//     setActive(id);
//     setMenuOpen(false);
//   };

//   return (
//     <>
//       <nav style={{
//         position:"fixed",top:0,left:0,right:0,zIndex:1000,
//         transition:"all .4s ease",
//         background: scrolled
//           ? "rgba(5,13,31,.92)"
//           : "transparent",
//         backdropFilter: scrolled ? "blur(20px)" : "none",
//         borderBottom: scrolled ? `1px solid ${T.border}` : "1px solid transparent",
//         padding: scrolled ? ".9rem 0" : "1.3rem 0",
//       }}>
//         <div style={{maxWidth:"1280px",margin:"0 auto",padding:"0 2rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>

//           {/* Logo */}
//           <div style={{display:"flex",alignItems:"center",gap:".75rem",cursor:"pointer"}} onClick={()=>scrollTo("Home")}>
//             <div style={{
//               width:"38px",height:"38px",borderRadius:"10px",
//               background:T.accent,
//               display:"flex",alignItems:"center",justifyContent:"center",
//               fontSize:"1.1rem",fontWeight:"800",color:T.navy,
//               fontFamily:"'Syne',sans-serif",
//               boxShadow:"0 0 20px rgba(0,198,255,.4)",
//             }}>A</div>
//             <span style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"1.1rem",letterSpacing:"-.01em"}}>
//               Sentinel<span style={{color:T.teal}}></span>
//             </span>
//           </div>

//           {/* Desktop Nav */}
//           <div className="hide-mobile" style={{display:"flex",alignItems:"center",gap:"2rem"}}>
//             {links.map(l=>(
//               <a key={l} className="nav-link" onClick={()=>scrollTo(l)}
//                 style={{color: active===l ? T.white : T.slate,
//                   borderBottom: active===l ? `2px solid ${T.teal}` : "2px solid transparent",
//                   paddingBottom:"2px",
//                 }}>
//                 {l}
//               </a>
//             ))}
//           </div>

//           {/* CTA */}
//           <div className="hide-mobile" style={{display:"flex",gap:".75rem",alignItems:"center"}}>
//             <Link to="/login"><button className="btn-secondary" style={{padding:".55rem 1.3rem",fontSize:".85rem"}}>
//               Sign In
//             </button></Link>    
//             <Link to="/register"><button className="btn-primary" style={{padding:".55rem 1.3rem",fontSize:".85rem"}}>
//               Get Started
//             </button></Link>
//           </div>

//           {/* Hamburger */}
//           <button onClick={()=>setMenuOpen(!menuOpen)}
//             style={{display:"none",background:"none",border:"none",cursor:"pointer",color:T.white,fontSize:"1.5rem"}}
//             className="full-mobile"
//             id="hamburger">
//             {menuOpen ? "✕" : "☰"}
//           </button>
//         </div>
//       </nav>

//       {/* Mobile Menu */}
//       {menuOpen && (
//         <div style={{
//           position:"fixed",top:"64px",left:0,right:0,zIndex:999,
//           background:"rgba(5,13,31,.98)",
//           backdropFilter:"blur(24px)",
//           borderBottom:`1px solid ${T.border}`,
//           padding:"1.5rem 2rem 2rem",
//           animation:"fadeIn .2s ease",
//         }}>
//           {links.map(l=>(
//             <div key={l} onClick={()=>scrollTo(l)}
//               style={{padding:".9rem 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer",
//                 color: active===l ? T.teal : T.slate,fontWeight:500,fontSize:".95rem"}}>
//               {l}
//             </div>
//           ))}
//           <div style={{display:"flex",gap:".75rem",marginTop:"1.5rem"}}>
//             <button className="btn-secondary" style={{flex:1}}>Sign In</button>
//             <button className="btn-primary" style={{flex:1}}>Get Started</button>
//           </div>
//         </div>
//       )}

//       <style>{`#hamburger{display:none!important;} @media(max-width:768px){#hamburger{display:block!important;}.hide-mobile{display:none!important;}}`}</style>
//     </>
//   );
// };

/*                           ─ HERO SECTION                           ─ */
const HeroSection = () => {
  const [typed, setTyped] = useState("");
  const words = ["Employees","Managers","Administrators"];
  const [wi, setWi] = useState(0);
  const [charI, setCharI] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(()=>{
    const word = words[wi];
    const speed = del ? 45 : 85;
    const timer = setTimeout(()=>{
      if(!del && charI < word.length){
        setTyped(word.slice(0,charI+1));setCharI(c=>c+1);
      } else if(!del && charI===word.length){
        setTimeout(()=>setDel(true),1200);
      } else if(del && charI>0){
        setTyped(word.slice(0,charI-1));setCharI(c=>c-1);
      } else {
        setDel(false);setWi((wi+1)%words.length);
      }
    },speed);
    return()=>clearTimeout(timer);
  },[typed,charI,del,wi]);

  return (
    <section id="home" style={{
      position:"relative",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"8rem 2rem 5rem",overflow:"hidden",
    }}>
      <GridBg/>

      {/* Floating orbs */}
      <div className="float-el" style={{
        position:"absolute",top:"18%",right:"8%",
        width:"320px",height:"320px",borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,198,255,.1) 0%,transparent 70%)",
        border:`1px solid rgba(0,198,255,.15)`,
      }}/>
      <div className="float-el" style={{
        position:"absolute",bottom:"15%",left:"5%",
        width:"200px",height:"200px",borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,255,209,.07) 0%,transparent 70%)",
        animationDelay:"1.5s",
      }}/>

      {/* Decorative badge top-right */}
      <div style={{
        position:"absolute",top:"22%",right:"12%",
        background:T.navyCard,border:`1px solid ${T.border}`,
        borderRadius:"14px",padding:"1rem 1.25rem",
        animation:"fadeIn 1s .8s ease forwards",opacity:0,
        boxShadow:T.shadow,
      }} className="hide-mobile">
        <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".4rem"}}>
          <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#10D988",display:"inline-block",boxShadow:"0 0 8px #10D988"}}/>
          <span style={{fontSize:".72rem",color:T.slate}}>Request #2847</span>
        </div>
        <div style={{fontSize:".82rem",fontWeight:"600"}}>Finance Role Access</div>
        <div style={{
          marginTop:".5rem",padding:".25rem .7rem",borderRadius:"100px",
          background:"rgba(16,217,136,.12)",color:"#10D988",
          fontSize:".72rem",fontWeight:"600",display:"inline-block",
        }}>✓ Approved in 4 min</div>
      </div>

      {/* Risk badge left */}
      <div style={{
        position:"absolute",top:"45%",left:"6%",
        background:T.navyCard,border:`1px solid ${T.border}`,
        borderRadius:"14px",padding:".9rem 1.1rem",
        animation:"fadeIn 1s 1.1s ease forwards",opacity:0,
        boxShadow:T.shadow,
      }} className="hide-mobile">
        <div style={{fontSize:".72rem",color:T.slate,marginBottom:".3rem"}}>Risk Score</div>
        <div style={{
          fontSize:"1.5rem",fontWeight:"800",fontFamily:"'Syne',sans-serif",
          background:T.accent,WebkitBackgroundClip:"text",
          WebkitTextFillColor:"transparent",backgroundClip:"text",
        }}>Low</div>
        <div style={{display:"flex",gap:"3px",marginTop:".4rem"}}>
          {[1,2,3,4,5].map(i=>(
            <div key={i} style={{width:"18px",height:"5px",borderRadius:"3px",
              background:i<=2?"#10D988":T.border,
              transition:"background .3s"}}/>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:"860px"}}>
        <div className="hero-animate">
          <span className="section-tag">
            <span className="pulse-el" style={{width:"7px",height:"7px",borderRadius:"50%",background:T.teal,display:"inline-block"}}/>
            Enterprise Access Management Platform
          </span>
        </div>

        <h1 className="hero-animate-2" style={{
          fontFamily:"'Syne',sans-serif",
          fontSize:"clamp(2.5rem,6vw,4.2rem)",
          fontWeight:"800",
          lineHeight:1.1,
          letterSpacing:"-.03em",
          marginBottom:"1.5rem",
        }}>
          Secure ERP Access<br/>
          <span className="gradient-text">Built for </span>
          <span style={{
            background:T.accent,WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",backgroundClip:"text",
          }}>{typed}</span>
          <span style={{
            borderRight:`2px solid ${T.teal}`,
            marginLeft:"2px",
            animation:"blink 1s step-end infinite",
            display:"inline-block",height:"1em",verticalAlign:"middle",
          }}/>
        </h1>

        <p className="hero-animate-3" style={{
          fontSize:"clamp(1rem,2vw,1.2rem)",
          color:T.slate,lineHeight:1.7,
          maxWidth:"600px",margin:"0 auto 2.5rem",
        }}>
          Automate role requests, streamline approvals, and enforce compliance — all in one AI-powered platform with real-time audit trails.
        </p>

        <div className="hero-animate-4" style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
          <button className="btn-primary" style={{fontSize:"1rem",padding:"1rem 2.25rem"}}>
            Start Free Trial →
          </button>
          <button className="btn-secondary" style={{fontSize:"1rem",padding:"1rem 2.25rem",display:"flex",alignItems:"center",gap:".5rem"}}>
            ▶ Watch Demo
          </button>
        </div>

        {/* Trust line */}
        <div style={{marginTop:"2.5rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"1.5rem",flexWrap:"wrap"}}>
          {["No credit card","SOC 2 Compliant","99.9% Uptime"].map(t=>(
            <span key={t} style={{
              display:"flex",alignItems:"center",gap:".4rem",
              fontSize:".82rem",color:T.slate,
            }}>
              <span style={{color:T.teal}}>✓</span> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

/*                           ─ STATS SECTION                           ─ */
const StatsSection = () => {
  const stats = [
    {num:"10K+", label:"Access Requests Processed"},
    {num:"99.9%", label:"System Uptime SLA"},
    {num:"<4min", label:"Average Approval Time"},
    {num:"500+", label:"Concurrent Users Supported"},
  ];
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{if(e.isIntersecting) setVisible(true);},{threshold:.3});
    if(ref.current) obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);

  return (
    <section ref={ref} style={{
      padding:"4rem 2rem",
      borderTop:`1px solid ${T.border}`,
      borderBottom:`1px solid ${T.border}`,
      background:T.navyMid,
    }}>
      <div style={{maxWidth:"1280px",margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"2rem",textAlign:"center"}}>
        {stats.map((s,i)=>(
          <div key={s.label} style={{
            animation: visible ? `countUp .6s ${i*.12}s ease forwards` : "none",
            opacity: visible ? 1 : 0,
          }}>
            <div style={{
              fontFamily:"'Syne',sans-serif",fontSize:"2.5rem",fontWeight:"800",
              background:T.accent,WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",backgroundClip:"text",
              marginBottom:".4rem",
            }}>{s.num}</div>
            <div style={{color:T.slate,fontSize:".88rem"}}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

/*                           ─ HOW IT WORKS                           ─ */
const HowItWorksSection = () => {
  const steps = [
    {
      num:"01",icon:"📝",
      title:"Submit a Request",
      desc:"Employees fill a smart form selecting their department, required ERP role, and justification. AI pre-fills context from their profile.",
      tag:"Employee Action",
    },
    {
      num:"02",icon:"🔍",
      title:"Manager Review",
      desc:"The assigned manager receives an instant notification. They review full context, add comments, and approve or reject in one click.",
      tag:"Manager Action",
    },
    {
      num:"03",icon:"🛡️",
      title:"Admin & Compliance",
      desc:"Approved requests are logged in the audit trail. Admins gain full analytics visibility. Risk scores flag anomalies automatically.",
      tag:"Admin Action",
    },
  ];

  return (
    <section id="how-it-works" style={{padding:"7rem 2rem",position:"relative",overflow:"hidden"}}>
      <div style={{
        position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        width:"700px",height:"700px",borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,198,255,.04) 0%,transparent 65%)",
        pointerEvents:"none",
      }}/>
      <div style={{maxWidth:"1280px",margin:"0 auto",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:"4rem"}}>
          <span className="section-tag">Process</span>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,4vw,2.8rem)",fontWeight:"800",letterSpacing:"-.03em",lineHeight:1.15}}>
            How <span className="gradient-text">Sentinel</span> Works
          </h2>
          <p style={{color:T.slate,marginTop:"1rem",maxWidth:"500px",margin:"1rem auto 0",lineHeight:1.7}}>
            A streamlined three-step workflow replacing manual, error-prone access management.
          </p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem",position:"relative"}}>
          {/* Connector line (desktop only) */}
          <div className="hide-mobile" style={{
            position:"absolute",top:"3.5rem",left:"20%",right:"20%",height:"1px",
            background:`linear-gradient(90deg,transparent,${T.teal},transparent)`,
            opacity:.3,zIndex:0,
          }}/>

          {steps.map((s,i)=>(
            <div key={s.num} className="card-hover" style={{
              background:T.navyCard,
              border:`1px solid ${T.border}`,
              borderRadius:"20px",
              padding:"2.5rem 2rem",
              position:"relative",
              zIndex:1,
            }}>
              <div style={{
                fontSize:"4rem",fontFamily:"'Syne',sans-serif",fontWeight:"800",
                background:T.accent,WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",backgroundClip:"text",
                opacity:.12,position:"absolute",top:"1rem",right:"1.5rem",
              }}>{s.num}</div>
              <div style={{
                width:"56px",height:"56px",borderRadius:"16px",
                background:"rgba(0,198,255,.1)",border:`1px solid ${T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.6rem",marginBottom:"1.5rem",
              }}>{s.icon}</div>
              <span style={{
                display:"inline-block",fontSize:".7rem",fontWeight:"600",
                color:T.teal,letterSpacing:".1em",textTransform:"uppercase",
                marginBottom:".75rem",
              }}>{s.tag}</span>
              <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",fontWeight:"700",marginBottom:".75rem"}}>
                {s.title}
              </h3>
              <p style={{color:T.slate,lineHeight:1.7,fontSize:".9rem"}}>{s.desc}</p>

              <div style={{
                marginTop:"1.5rem",display:"flex",alignItems:"center",gap:".5rem",
                color:T.teal,fontSize:".82rem",fontWeight:"600",cursor:"pointer",
              }}>
                Learn more <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/*                           ─ FEATURES SECTION                           ─ */
const FeaturesSection = () => {
  const features = [
    {icon:"🤖",title:"AI Role Recommendation",desc:"Smart suggestions based on department, job title, and historical patterns from similar employees.",badge:"AI Powered"},
    {icon:"⚡",title:"Auto Escalation",desc:"Requests not reviewed within 48 hours are automatically escalated to higher authority with full context.",badge:"Automation"},
    {icon:"🎯",title:"Risk Scoring Engine",desc:"Each request gets a dynamic risk score (Low/Medium/High) based on role sensitivity and user history.",badge:"Security"},
    {icon:"⏱️",title:"Smart Expiry Access",desc:"Grant temporary project-based access that automatically revokes on the expiry date — zero manual effort.",badge:"Automation"},
    {icon:"📊",title:"Real-Time Analytics",desc:"Admin dashboards with live charts: approval times, request trends, most-requested roles, and security alerts.",badge:"Insights"},
    {icon:"🔒",title:"Audit & Compliance",desc:"Immutable audit logs with user, action, timestamp, IP address, and affected resource for every event.",badge:"Compliance"},
    {icon:"🔔",title:"Smart Notifications",desc:"Role-specific notifications via platform alerts. Managers, employees, and admins stay informed instantly.",badge:"UX"},
    {icon:"🔑",title:"Access Revocation",desc:"Instantly revoke access during offboarding or role changes. Every revocation is logged with full context.",badge:"Security"},
  ];

  return (
    <section id="features" style={{padding:"7rem 2rem",background:T.navyMid,position:"relative"}}>
      <div style={{
        position:"absolute",top:0,left:0,right:0,height:"1px",
        background:`linear-gradient(90deg,transparent,${T.teal},transparent)`,
        opacity:.3,
      }}/>
      <div style={{maxWidth:"1280px",margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"4rem"}}>
          <span className="section-tag">Capabilities</span>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,4vw,2.8rem)",fontWeight:"800",letterSpacing:"-.03em",lineHeight:1.15}}>
            Everything You Need to <span className="gradient-text">Stay Secure</span>
          </h2>
          <p style={{color:T.slate,marginTop:"1rem",maxWidth:"520px",margin:"1rem auto 0",lineHeight:1.7}}>
            A complete feature set that turns complex ERP access management into a seamless, automated workflow.
          </p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"1.25rem"}}>
          {features.map((f,i)=>(
            <div key={f.title} className="card-hover" style={{
              background:T.navyCard,
              border:`1px solid ${T.border}`,
              borderRadius:"16px",
              padding:"1.75rem",
              cursor:"default",
              position:"relative",
              overflow:"hidden",
            }}>
              {/* Gradient corner */}
              <div style={{
                position:"absolute",top:0,right:0,
                width:"80px",height:"80px",
                background:`radial-gradient(circle at top right,rgba(0,198,255,.1),transparent 70%)`,
              }}/>
              <div style={{
                width:"48px",height:"48px",borderRadius:"14px",
                background:"rgba(0,198,255,.08)",border:`1px solid ${T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.4rem",marginBottom:"1.25rem",
              }}>{f.icon}</div>
              <div style={{
                fontSize:".68rem",fontWeight:"700",letterSpacing:".1em",
                textTransform:"uppercase",color:T.cyan,marginBottom:".6rem",
              }}>{f.badge}</div>
              <h3 style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"1rem",marginBottom:".6rem"}}>
                {f.title}
              </h3>
              <p style={{color:T.slate,fontSize:".86rem",lineHeight:1.65}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/*                           ─ ROLES SECTION                           ─ */
const RolesSection = () => {
  const [active, setActive] = useState(0);
  const roles = [
    {
      name:"Employee",icon:"👤",color:"#00C6FF",
      tagline:"Submit & Track Requests",
      desc:"Employees request ERP access in minutes. The smart form pre-fills profile data, AI recommends the best role, and real-time status keeps them informed at every step.",
      features:[
        "Submit access request with AI role suggestions",
        "View request status & manager comments",
        "Access history & timeline view",
        "Profile management",
      ],
      cta:"Employee Portal →",
    },
    {
      name:"Manager",icon:"🧑‍💼",color:"#00FFD1",
      tagline:"Approve with Full Context",
      desc:"Managers get instant notifications for pending requests. A side panel delivers full justification, employee context, and one-click approve/reject with comment — all in under 15 seconds.",
      features:[
        "Instant notification for new requests",
        "Risk score visibility per request",
        "One-click approve / reject + comment",
        "Team access monitoring dashboard",
      ],
      cta:"Manager Portal →",
    },
    {
      name:"Admin",icon:"🛡️",color:"#A78BFA",
      tagline:"Govern the Entire System",
      desc:"Admins control role templates, manage user accounts, and monitor system health through rich analytics and an immutable audit log that satisfies compliance auditors.",
      features:[
        "Role template creation & permission matrix",
        "User activation, deactivation, role change",
        "Full audit log with IP & action history",
        "System analytics with trend charts",
      ],
      cta:"Admin Console →",
    },
  ];
  const r = roles[active];

  return (
    <section id="roles" style={{padding:"7rem 2rem",position:"relative",overflow:"hidden"}}>
      <GridBg/>
      <div style={{maxWidth:"1280px",margin:"0 auto",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
          <span className="section-tag">Access Levels</span>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,4vw,2.8rem)",fontWeight:"800",letterSpacing:"-.03em"}}>
            Built for <span className="gradient-text">Every Role</span>
          </h2>
        </div>

        {/* Tab selector */}
        <div style={{display:"flex",gap:".75rem",justifyContent:"center",marginBottom:"3rem",flexWrap:"wrap"}}>
          {roles.map((role,i)=>(
            <button key={role.name} onClick={()=>setActive(i)}
              style={{
                background: active===i ? "rgba(0,198,255,.12)" : "transparent",
                border: `1.5px solid ${active===i ? role.color : T.border}`,
                color: active===i ? role.color : T.slate,
                borderRadius:"100px",padding:".6rem 1.5rem",
                cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                fontWeight:"600",fontSize:".88rem",
                transition:"all .25s ease",
                display:"flex",alignItems:"center",gap:".5rem",
              }}>
              {role.icon} {role.name}
            </button>
          ))}
        </div>

        {/* Role detail card */}
        <div style={{
          background:T.navyCard,border:`1px solid ${T.border}`,
          borderRadius:"24px",padding:"3rem",
          display:"grid",gridTemplateColumns:"1fr 1fr",
          gap:"3rem",alignItems:"center",
          boxShadow:T.shadow,
        }}
          className="stack-mobile"
        >
          {/* Left */}
          <div>
            <div style={{
              display:"inline-flex",alignItems:"center",gap:".6rem",
              padding:".4rem 1rem",borderRadius:"100px",marginBottom:"1.5rem",
              background:`rgba(${r.color=="#00C6FF"?"0,198,255":r.color=="#00FFD1"?"0,255,209":"167,139,250"},.1)`,
              border:`1px solid ${r.color}30`,
              color:r.color,fontSize:".8rem",fontWeight:"600",
            }}>
              <span style={{fontSize:"1rem"}}>{r.icon}</span>
              {r.tagline}
            </div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:"800",marginBottom:"1rem"}}>
              {r.name} <span style={{color:r.color}}>Experience</span>
            </h3>
            <p style={{color:T.slate,lineHeight:1.75,fontSize:".95rem",marginBottom:"1.75rem"}}>{r.desc}</p>
            <button className="btn-primary" style={{fontSize:".9rem"}}>{r.cta}</button>
          </div>

          {/* Right — feature list */}
          <div>
            <div style={{
              background:"rgba(0,198,255,.04)",border:`1px solid ${T.border}`,
              borderRadius:"16px",padding:"1.75rem",
            }}>
              <div style={{fontSize:".78rem",fontWeight:"600",color:T.slate,textTransform:"uppercase",letterSpacing:".08em",marginBottom:"1.25rem"}}>
                Key Capabilities
              </div>
              {r.features.map((f,i)=>(
                <div key={i} style={{
                  display:"flex",alignItems:"flex-start",gap:".75rem",
                  marginBottom: i<r.features.length-1 ? "1rem" : 0,
                  paddingBottom: i<r.features.length-1 ? "1rem" : 0,
                  borderBottom: i<r.features.length-1 ? `1px solid ${T.border}` : "none",
                }}>
                  <div style={{
                    width:"22px",height:"22px",minWidth:"22px",borderRadius:"6px",
                    background:`rgba(${r.color=="#00C6FF"?"0,198,255":r.color=="#00FFD1"?"0,255,209":"167,139,250"},.15)`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:r.color,fontSize:".7rem",marginTop:"1px",fontWeight:"700",
                  }}>✓</div>
                  <span style={{color:T.slate,fontSize:".9rem",lineHeight:1.5}}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/*                           ─ SECURITY SECTION                           ─ */
const SecuritySection = () => {
  const items = [
    {icon:"🔐",title:"JWT Authentication",desc:"Secure token-based sessions with auto-expiry and refresh handling."},
    {icon:"🔒",title:"Password Encryption",desc:"Industry-standard bcrypt hashing protects all user credentials."},
    {icon:"📡",title:"HTTPS Only",desc:"All communications are encrypted in transit. No exceptions."},
    {icon:"🏛️",title:"Immutable Audit Trail",desc:"Every action is permanently logged — deletion is impossible."},
    {icon:"⚠️",title:"Risk-Based Alerts",desc:"High-risk requests trigger admin alerts and require additional approval steps."},
    {icon:"♻️",title:"Access Revocation",desc:"Instant revocation with a full log entry, built for compliance and offboarding."},
  ];

  return (
    <section id="security" style={{padding:"7rem 2rem",background:T.navyMid,position:"relative"}}>
      <div style={{
        position:"absolute",top:0,left:0,right:0,height:"1px",
        background:`linear-gradient(90deg,transparent,${T.teal},transparent)`,
        opacity:.3,
      }}/>
      <div style={{maxWidth:"1280px",margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5rem",alignItems:"center"}} className="stack-mobile">
          {/* Left text */}
          <div>
            <span className="section-tag">Trust & Compliance</span>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,4vw,2.6rem)",fontWeight:"800",letterSpacing:"-.03em",lineHeight:1.2,marginBottom:"1.25rem"}}>
              Enterprise-Grade<br/><span className="gradient-text">Security Built In</span>
            </h2>
            <p style={{color:T.slate,lineHeight:1.75,fontSize:".95rem",marginBottom:"2rem"}}>
              Security isn't a feature — it's the foundation. Sentinel is architected from the ground up with zero-trust principles, encrypted communications, and compliance-ready audit trails.
            </p>
            <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
              {["SOC 2","GDPR Ready","99.9% Uptime"].map(b=>(
                <div key={b} style={{
                  padding:".45rem 1rem",borderRadius:"100px",
                  border:`1px solid ${T.border}`,
                  background:"rgba(0,198,255,.05)",
                  fontSize:".78rem",fontWeight:"600",color:T.teal,
                }}>✓ {b}</div>
              ))}
            </div>
          </div>

          {/* Right grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            {items.map(item=>(
              <div key={item.title} className="card-hover" style={{
                background:T.navyCard,border:`1px solid ${T.border}`,
                borderRadius:"16px",padding:"1.5rem 1.25rem",
              }}>
                <div style={{fontSize:"1.5rem",marginBottom:".75rem"}}>{item.icon}</div>
                <h4 style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:".9rem",marginBottom:".4rem"}}>{item.title}</h4>
                <p style={{color:T.slate,fontSize:".8rem",lineHeight:1.55}}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/*                           ─ AI FEATURES SECTION                           ─ */
const AISection = () => (
  <section style={{padding:"7rem 2rem",position:"relative",overflow:"hidden"}}>
    <div style={{
      position:"absolute",top:"50%",right:"-10%",transform:"translateY(-50%)",
      width:"600px",height:"600px",borderRadius:"50%",
      background:"radial-gradient(circle,rgba(0,255,209,.06) 0%,transparent 65%)",
      pointerEvents:"none",
    }}/>
    <div style={{maxWidth:"1280px",margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5rem",alignItems:"center"}} className="stack-mobile">
        {/* Visual card stack */}
        <div style={{position:"relative",height:"380px"}} className="hide-mobile">
          {/* Main card */}
          <div style={{
            position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            background:T.navyCard,border:`1px solid ${T.border}`,
            borderRadius:"20px",padding:"2rem",width:"320px",
            boxShadow:"0 20px 60px rgba(0,0,0,.4)",
          }}>
            <div style={{fontSize:".72rem",color:T.slate,marginBottom:"1rem",fontWeight:"600",letterSpacing:".08em",textTransform:"uppercase"}}>
              🤖 AI Recommendation
            </div>
            {[
              {role:"Finance Analyst",match:97,color:T.cyan},
              {role:"Data Viewer",match:84,color:T.teal},
              {role:"Report Reader",match:71,color:"#8DA5C4"},
            ].map(r=>(
              <div key={r.role} style={{marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:".3rem"}}>
                  <span style={{fontSize:".85rem",fontWeight:"500"}}>{r.role}</span>
                  <span style={{fontSize:".8rem",color:r.color,fontWeight:"600"}}>{r.match}%</span>
                </div>
                <div style={{height:"5px",borderRadius:"3px",background:T.border,overflow:"hidden"}}>
                  <div style={{
                    height:"100%",width:`${r.match}%`,
                    background:`linear-gradient(90deg,${r.color},${T.teal})`,
                    borderRadius:"3px",
                  }}/>
                </div>
              </div>
            ))}
            <button className="btn-primary" style={{width:"100%",marginTop:".5rem",fontSize:".85rem",padding:".7rem"}}>
              Apply Recommendation
            </button>
          </div>
          {/* Background decorative cards */}
          <div style={{
            position:"absolute",top:"30%",left:"10%",
            background:T.navyCard,border:`1px solid ${T.border}`,
            borderRadius:"16px",padding:"1rem",width:"150px",
            transform:"rotate(-6deg)",opacity:.6,
          }}>
            <div style={{fontSize:".7rem",color:T.teal}}>Risk Score</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.5rem",fontWeight:"800",color:T.cyan}}>Low</div>
          </div>
        </div>

        {/* Right text */}
        <div>
          <span className="section-tag">AI-Powered</span>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,4vw,2.6rem)",fontWeight:"800",letterSpacing:"-.03em",lineHeight:1.2,marginBottom:"1.25rem"}}>
            Smarter Access<br/><span className="gradient-text">With AI at the Core</span>
          </h2>
          <p style={{color:T.slate,lineHeight:1.75,fontSize:".95rem",marginBottom:"2rem"}}>
            Our intelligent engine analyzes department, job title, and peer patterns to recommend the ideal ERP role — reducing manual errors and accelerating approvals.
          </p>
          {[
            {icon:"🤖",title:"Role Recommendation",desc:"AI suggests the best-fit ERP roles based on your profile and organizational patterns."},
            {icon:"🎯",title:"Risk Scoring",desc:"Dynamic risk levels (Low/Medium/High) computed per request for compliance visibility."},
            {icon:"⏰",title:"Auto Escalation",desc:"Idle approvals auto-escalate after 48 hours — nothing falls through the cracks."},
          ].map(f=>(
            <div key={f.title} style={{display:"flex",gap:"1rem",marginBottom:"1.5rem",alignItems:"flex-start"}}>
              <div style={{
                width:"44px",height:"44px",minWidth:"44px",borderRadius:"12px",
                background:"rgba(0,198,255,.1)",border:`1px solid ${T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.2rem",
              }}>{f.icon}</div>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:".95rem",marginBottom:".3rem"}}>{f.title}</div>
                <div style={{color:T.slate,fontSize:".86rem",lineHeight:1.6}}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/*                           ─ TESTIMONIALS                           ─ */
const TestimonialsSection = () => {
  const items = [
    {quote:"Sentinel cut our ERP onboarding from 3 days to under an hour. The AI role suggestions are surprisingly accurate.",name:"Sarah Chen",role:"IT Director, Nexara Group",avatar:"SC"},
    {quote:"The audit trail feature alone was worth the switch. Our compliance audit passed without a single remediation finding.",name:"Marcus Oduya",role:"CISO, FinSecure Ltd",avatar:"MO"},
    {quote:"Our managers love the side-panel review flow. Approving access requests went from 20 minutes to literally 15 seconds.",name:"Priya Kapoor",role:"Engineering Manager, CloudBridge",avatar:"PK"},
  ];

  return (
    <section style={{padding:"7rem 2rem",background:T.navyMid,position:"relative"}}>
      <div style={{
        position:"absolute",top:0,left:0,right:0,height:"1px",
        background:`linear-gradient(90deg,transparent,${T.teal},transparent)`,
        opacity:.3,
      }}/>
      <div style={{maxWidth:"1280px",margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"4rem"}}>
          <span className="section-tag">Testimonials</span>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,4vw,2.8rem)",fontWeight:"800",letterSpacing:"-.03em"}}>
            Trusted by <span className="gradient-text">Security Teams</span>
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem"}}>
          {items.map((t,i)=>(
            <div key={i} className="card-hover" style={{
              background:T.navyCard,border:`1px solid ${T.border}`,
              borderRadius:"20px",padding:"2rem",
              position:"relative",overflow:"hidden",
            }}>
              <div style={{
                position:"absolute",top:"-20px",right:"-20px",
                fontSize:"6rem",opacity:.04,lineHeight:1,
                fontFamily:"serif",color:T.teal,
              }}>"</div>
              <div style={{
                fontSize:"1.3rem",marginBottom:"1.25rem",
                color:T.teal,opacity:.7,
              }}>"</div>
              <p style={{color:T.slate,lineHeight:1.75,fontSize:".93rem",marginBottom:"1.75rem",fontStyle:"italic"}}>
                {t.quote}
              </p>
              <div style={{display:"flex",alignItems:"center",gap:".9rem",borderTop:`1px solid ${T.border}`,paddingTop:"1.25rem"}}>
                <div style={{
                  width:"40px",height:"40px",borderRadius:"50%",minWidth:"40px",
                  background:T.accent,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"'Syne',sans-serif",fontWeight:"700",
                  color:T.navy,fontSize:".85rem",
                }}>{t.avatar}</div>
                <div>
                  <div style={{fontWeight:"600",fontSize:".9rem"}}>{t.name}</div>
                  <div style={{color:T.slate,fontSize:".78rem"}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/*                           ─ FAQ SECTION                           ─ */
const FAQSection = () => {
  const [open, setOpen] = useState(null);
  const faqs = [
    {q:"How does the AI role recommendation work?",a:"The AI engine analyzes the employee's department, job title, and historical patterns from similar employees to suggest the best-fitting ERP roles, reducing manual selection errors by up to 70%."},
    {q:"What happens if a manager doesn't respond to a request?",a:"If a manager doesn't review a request within 48 hours, our Auto Escalation System automatically notifies the next authority level with the full request context and a priority flag."},
    {q:"How are audit logs stored and can they be deleted?",a:"Audit logs are stored in an append-only database collection. Even admins cannot delete log entries. Every logged event includes user, action, IP address, timestamp, and affected resource."},
    {q:"Can access be set to expire automatically?",a:"Yes. The Smart Expiry Access feature lets approvers grant temporary access with a defined end date. The system automatically revokes the access and logs the revocation event when the date arrives."},
    {q:"What user roles does the system support?",a:"The system supports three primary roles: Employee (submits and tracks requests), Manager (reviews and approves/rejects), and Admin (manages roles, users, and views analytics). Role assignment is controlled by admins."},
    {q:"Is the system scalable for large enterprises?",a:"Yes. The modular MERN architecture supports 500+ concurrent users and is designed for ERP integration. New modules and role types can be added without disrupting existing workflows."},
  ];

  return (
    <section id="faq" style={{padding:"7rem 2rem",position:"relative"}}>
      <div style={{maxWidth:"800px",margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"4rem"}}>
          <span className="section-tag">FAQ</span>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(1.8rem,4vw,2.8rem)",fontWeight:"800",letterSpacing:"-.03em"}}>
            Frequently <span className="gradient-text">Asked Questions</span>
          </h2>
        </div>
        {faqs.map((f,i)=>(
          <div key={i} className="faq-item" onClick={()=>setOpen(open===i?null:i)}
            style={{cursor:"pointer",userSelect:"none"}}>
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"1.5rem 0",
            }}>
              <h3 style={{fontFamily:"'Syne',sans-serif",fontWeight:"600",fontSize:"1rem",paddingRight:"1rem"}}>
                {f.q}
              </h3>
              <span style={{
                color:T.teal,fontSize:"1.2rem",transition:"transform .3s ease",
                transform: open===i ? "rotate(45deg)" : "rotate(0deg)",
                minWidth:"20px",textAlign:"center",
              }}>+</span>
            </div>
            {open===i && (
              <div style={{
                paddingBottom:"1.5rem",color:T.slate,lineHeight:1.75,fontSize:".93rem",
                animation:"fadeUp .25s ease",
              }}>
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

/*                           ─ CTA SECTION                           ─ */
const CTASection = () => (
  <section style={{padding:"7rem 2rem",position:"relative",overflow:"hidden"}}>
    <div style={{
      position:"absolute",inset:0,
      background:`radial-gradient(ellipse at center,rgba(0,198,255,.1) 0%,transparent 65%)`,
      pointerEvents:"none",
    }}/>
    <div style={{maxWidth:"700px",margin:"0 auto",textAlign:"center",position:"relative",zIndex:1}}>
      {/* Decorative ring */}
      <div style={{
        width:"160px",height:"160px",borderRadius:"50%",
        border:`1px solid rgba(0,198,255,.2)`,
        display:"flex",alignItems:"center",justifyContent:"center",
        margin:"0 auto 2.5rem",
        position:"relative",
      }}>
        <div style={{
          width:"110px",height:"110px",borderRadius:"50%",
          border:`1px solid rgba(0,198,255,.35)`,
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"borderGlow 3s ease-in-out infinite",
        }}>
          <div style={{
            width:"70px",height:"70px",borderRadius:"50%",
            background:T.accent,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"1.8rem",
            boxShadow:"0 0 40px rgba(0,198,255,.5)",
          }}>🔑</div>
        </div>
      </div>

      <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(2rem,5vw,3rem)",fontWeight:"800",letterSpacing:"-.03em",lineHeight:1.15,marginBottom:"1.25rem"}}>
        Ready to Automate<br/><span className="gradient-text">Your ERP Access?</span>
      </h2>
      <p style={{color:T.slate,lineHeight:1.75,fontSize:"1rem",marginBottom:"2.5rem"}}>
        Join organizations that have replaced manual access processes with Sentinel. Start your free trial — no credit card required.
      </p>
      <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn-primary" style={{fontSize:"1rem",padding:"1rem 2.5rem"}}>
          Start Free Trial →
        </button>
        <button className="btn-secondary" style={{fontSize:"1rem",padding:"1rem 2.5rem"}}>
          Schedule a Demo
        </button>
      </div>
      <p style={{color:T.slate,fontSize:".8rem",marginTop:"1.5rem"}}>
        Free 14-day trial · No setup fees · Cancel anytime
      </p>
    </div>
  </section>
);

/*                           ─ FOOTER                           ─ */
const Footer = () => {
  const cols = [
    {title:"Product",links:["Features","How It Works","Pricing","Security","Changelog"]},
    {title:"Roles",links:["Employee Portal","Manager Dashboard","Admin Console","Security Officer"]},
    {title:"Company",links:["About Us","Blog","Careers","Press Kit","Contact"]},
    {title:"Legal",links:["Privacy Policy","Terms of Service","Cookie Policy","GDPR","DPA"]},
  ];

  return (
    <footer style={{
      background:T.navyMid,
      borderTop:`1px solid ${T.border}`,
      padding:"5rem 2rem 2rem",
    }}>
      <div style={{maxWidth:"1280px",margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr repeat(4,1fr)",gap:"3rem",marginBottom:"4rem"}} className="stack-mobile">
          {/* Brand */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:"1.25rem"}}>
              <div style={{
                width:"38px",height:"38px",borderRadius:"10px",
                background:T.accent,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Syne',sans-serif",fontWeight:"800",color:T.navy,fontSize:"1.1rem",
                boxShadow:"0 0 20px rgba(0,198,255,.3)",
              }}>S</div>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"1.1rem"}}>
                Sentinel<span style={{color:T.teal}}>🔒</span>
              </span>
            </div>
            <p style={{color:T.slate,fontSize:".88rem",lineHeight:1.7,maxWidth:"240px",marginBottom:"1.5rem"}}>
              Enterprise ERP access management with AI-powered workflows, built for security and compliance.
            </p>
            <div style={{display:"flex",gap:".75rem"}}>
              {["𝕏","in","⬛","▶"].map((s,i)=>(
                <div key={i} style={{
                  width:"36px",height:"36px",borderRadius:"9px",
                  background:"rgba(0,198,255,.07)",border:`1px solid ${T.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:T.slate,cursor:"pointer",fontSize:".8rem",
                  transition:"all .2s ease",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.teal;e.currentTarget.style.color=T.teal;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.slate;}}
                >{s}</div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map(col=>(
            <div key={col.title}>
              <h4 style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:".85rem",marginBottom:"1.25rem",letterSpacing:".04em"}}>
                {col.title}
              </h4>
              {col.links.map(l=>(
                <div key={l} style={{marginBottom:".65rem"}}>
                  <a href="#" style={{
                    color:T.slate,fontSize:".85rem",textDecoration:"none",
                    transition:"color .2s ease",
                  }}
                    onMouseEnter={e=>e.target.style.color=T.white}
                    onMouseLeave={e=>e.target.style.color=T.slate}
                  >{l}</a>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop:`1px solid ${T.border}`,
          paddingTop:"2rem",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          flexWrap:"wrap",gap:"1rem",
        }}>
          <p style={{color:T.slate,fontSize:".82rem"}}>
            © 2025 Sentinel. All rights reserved. Built for enterprise security teams.
          </p>
          <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
            <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#10D988",display:"inline-block",boxShadow:"0 0 8px #10D988"}}/>
            <span style={{color:T.slate,fontSize:".8rem"}}>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

/*                           ─ SECTION WRAPPER                           ─ */
const AnimatedSection = ({children,id}) => {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);obs.disconnect();}},{threshold:.12});
    if(ref.current) obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);
  return (
    <div ref={ref} id={id} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(24px)",
      transition:"opacity .7s ease,transform .7s ease",
    }}>
      {children}
    </div>
  );
};

/*                           ─ APP ROOT                           ─ */
export default function LandingPage() {
  return (
    <>
      <GlobalStyles/>
      {/* <Navbar/> */}
      <main>
        <HeroSection/>
        <AnimatedSection><StatsSection/></AnimatedSection>
        <AnimatedSection id="how-it-works"><HowItWorksSection/></AnimatedSection>
        <AnimatedSection id="features"><FeaturesSection/></AnimatedSection>
        <AnimatedSection id="roles"><RolesSection/></AnimatedSection>
        <AnimatedSection id="security"><SecuritySection/></AnimatedSection>
        <AnimatedSection><AISection/></AnimatedSection>
        <AnimatedSection><TestimonialsSection/></AnimatedSection>
        <AnimatedSection id="faq"><FAQSection/></AnimatedSection>
        <AnimatedSection><CTASection/></AnimatedSection>
      </main>
      <Footer/>
    </>
  );
}
