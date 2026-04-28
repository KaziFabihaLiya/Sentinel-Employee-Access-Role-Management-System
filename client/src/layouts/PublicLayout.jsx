import { Outlet, Link, NavLink, useLocation } from 'react-router';
import { useState, useEffect } from 'react';

/*   ─ tokens   ─ */
const T = {
  navy:    '#050D1F',
  navyMid: '#0B1730',
  surface: '#0F1E38',
  teal:    '#00C6FF',
  cyan:    '#00FFD1',
  gradient:'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  white:   '#FFFFFF',
  slate:   '#8DA5C4',
  muted:   '#4A6080',
  border:  'rgba(0,198,255,0.12)',
  borderH: 'rgba(0,198,255,0.32)',
};

const FONT_URL = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";

const GlobalStyles = () => (
  <style>{`
    @import url('${FONT_URL}');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{font-family:'DM Sans',sans-serif;background:${T.navy};color:${T.white};overflow-x:hidden;}
    ::selection{background:${T.teal};color:${T.navy};}
    ::-webkit-scrollbar{width:5px;}
    ::-webkit-scrollbar-track{background:${T.navy};}
    ::-webkit-scrollbar-thumb{background:${T.teal};border-radius:3px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes gridMove{0%{transform:translateY(0);}100%{transform:translateY(60px);}}
    @keyframes pulse{0%,100%{opacity:.6;}50%{opacity:1;}}
    @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
    .pl-animate{animation:fadeUp .7s ease forwards;}
    .pl-fade{animation:fadeIn .5s ease forwards;}
    .gradient-text{
      background:${T.gradient};
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    .pub-nav-link{
      color:${T.slate};font-size:.88rem;font-weight:500;
      text-decoration:none;transition:color .2s ease;cursor:pointer;
      padding-bottom:2px;border-bottom:2px solid transparent;
    }
    .pub-nav-link:hover,.pub-nav-link.active{color:${T.white};border-bottom-color:${T.teal};}
    .btn-primary{
      background:${T.gradient};border:none;color:${T.navy};
      font-family:'DM Sans',sans-serif;font-weight:700;font-size:.88rem;
      padding:.6rem 1.4rem;border-radius:9px;cursor:pointer;
      transition:transform .2s,box-shadow .2s,filter .2s;letter-spacing:.01em;
      position:relative;overflow:hidden;
    }
    .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,198,255,.4);filter:brightness(1.08);}
    .btn-ghost{
      background:transparent;border:1.5px solid ${T.teal};color:${T.teal};
      font-family:'DM Sans',sans-serif;font-weight:600;font-size:.88rem;
      padding:.58rem 1.4rem;border-radius:9px;cursor:pointer;
      transition:all .2s ease;
    }
    .btn-ghost:hover{background:rgba(0,198,255,.1);box-shadow:0 0 18px rgba(0,198,255,.2);}
    input,select,textarea{
      font-family:'DM Sans',sans-serif;
      background:${T.surface};
      border:1px solid ${T.border};
      color:${T.white};border-radius:10px;
      padding:.75rem 1rem;font-size:.93rem;
      outline:none;width:100%;box-sizing:border-box;
      transition:border-color .2s,box-shadow .2s;
    }
    input:focus,select:focus,textarea:focus{
      border-color:${T.teal};
      box-shadow:0 0 0 3px rgba(0,198,255,.12);
    }
    input::placeholder,textarea::placeholder{color:${T.muted};}
    select option{background:${T.surface};color:${T.white};}
    @media(max-width:768px){
      .pub-hide-mobile{display:none!important;}
      .pub-stack{flex-direction:column!important;}
    }
  `}</style>
);

/*   ─ Grid background   ─ */
const GridBg = () => (
  <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
    <div style={{
      position:'absolute',inset:0,
      backgroundImage:`linear-gradient(rgba(0,198,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,198,255,.04) 1px,transparent 1px)`,
      backgroundSize:'60px 60px',animation:'gridMove 10s linear infinite',
    }}/>
    <div style={{
      position:'absolute',top:'-20%',left:'50%',transform:'translateX(-50%)',
      width:'800px',height:'600px',
      background:'radial-gradient(ellipse,rgba(0,198,255,.10) 0%,transparent 70%)',
    }}/>
  </div>
);

/*   ─ Navbar   ─ */
const PublicNavbar = () => {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const navLinks = [
    { label: 'About',   to: '/about'   },
    { label: 'Support', to: '/support' },
  ];

  return (
    <>
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:1000,
        transition:'all .4s ease',
        background: scrolled ? 'rgba(5,13,31,.93)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${T.border}` : '1px solid transparent',
        padding: scrolled ? '.8rem 0' : '1.2rem 0',
      }}>
        <div style={{maxWidth:'1200px',margin:'0 auto',padding:'0 2rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          {/* Logo */}
          <Link to="/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'.7rem'}}>
            <div style={{
              width:'36px',height:'36px',borderRadius:'9px',
              background:T.gradient,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:"'Syne',sans-serif",fontWeight:'800',color:T.navy,fontSize:'1rem',
              boxShadow:'0 0 18px rgba(0,198,255,.4)',
            }}>S</div>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.05rem',color:T.white,letterSpacing:'-.01em',lineHeight:1}}>
                Sentinel
              </div>
              <div style={{fontSize:'.6rem',color:T.slate,letterSpacing:'.04em',lineHeight:1,marginTop:'1px'}}>
                GUARD EVERY GATEWAY
              </div>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="pub-hide-mobile" style={{display:'flex',alignItems:'center',gap:'2rem'}}>
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} className={({isActive})=>`pub-nav-link${isActive?' active':''}`}>
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="pub-hide-mobile" style={{display:'flex',gap:'.7rem',alignItems:'center'}}>
            <Link to="/login"><button className="btn-ghost" style={{padding:'.5rem 1.2rem'}}>Sign In</button></Link>
            <Link to="/register"><button className="btn-primary" style={{padding:'.5rem 1.2rem'}}>Get Started</button></Link>
          </div>

          {/* Hamburger */}
          <button onClick={()=>setMenuOpen(o=>!o)} style={{
            display:'none',background:'none',border:'none',
            color:T.white,fontSize:'1.4rem',cursor:'pointer',
          }} id="pub-ham">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position:'fixed',top:'64px',left:0,right:0,zIndex:999,
          background:'rgba(5,13,31,.97)',backdropFilter:'blur(24px)',
          borderBottom:`1px solid ${T.border}`,
          padding:'1.5rem 2rem 2rem',animation:'fadeIn .2s ease',
        }}>
          {navLinks.map(l=>(
            <NavLink key={l.to} to={l.to} style={{
              display:'block',padding:'.9rem 0',
              borderBottom:`1px solid ${T.border}`,
              color:T.slate,textDecoration:'none',fontWeight:500,
            }}>{l.label}</NavLink>
          ))}
          <div style={{display:'flex',gap:'.75rem',marginTop:'1.5rem'}}>
            <Link to="/login" style={{flex:1}}><button className="btn-ghost" style={{width:'100%'}}>Sign In</button></Link>
            <Link to="/register" style={{flex:1}}><button className="btn-primary" style={{width:'100%'}}>Get Started</button></Link>
          </div>
        </div>
      )}
      <style>{`#pub-ham{display:none!important;} @media(max-width:768px){#pub-ham{display:block!important;}.pub-hide-mobile{display:none!important;}}`}</style>
    </>
  );
};

/*   ─ Footer   ─ */
const PublicFooter = () => (
  <footer style={{
    background:T.navyMid,
    borderTop:`1px solid ${T.border}`,
    padding:'2rem',
  }}>
    <div style={{maxWidth:'1200px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
        <div style={{
          width:'28px',height:'28px',borderRadius:'7px',
          background:T.gradient,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:"'Syne',sans-serif",fontWeight:'800',color:T.navy,fontSize:'.85rem',
        }}>S</div>
        <div>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.9rem',color:T.white}}>Sentinel</span>
          <span style={{color:T.muted,fontSize:'.75rem',marginLeft:'.4rem'}}>— Guard Every Gateway. Grant with Confidence.</span>
        </div>
      </div>
      <div style={{display:'flex',gap:'1.5rem',alignItems:'center'}}>
        <Link to="/about"   style={{color:T.muted,fontSize:'.82rem',textDecoration:'none'}}>About</Link>
        <Link to="/support" style={{color:T.muted,fontSize:'.82rem',textDecoration:'none'}}>Support</Link>
        <span style={{color:T.muted,fontSize:'.8rem'}}>© 2026 Sentinel by Kazi Fabiha Golam Liya</span>
      </div>
    </div>
  </footer>
);

/*   ─ Layout   ─ */
const PublicLayout = () => (
  <>
    <GlobalStyles/>
    <div style={{minHeight:'100vh',background:T.navy,display:'flex',flexDirection:'column'}}>
      <PublicNavbar/>
      <main style={{flex:1,paddingTop:'64px'}}>
        <Outlet/>
      </main>
      <PublicFooter/>
    </div>
  </>
);

export default PublicLayout;