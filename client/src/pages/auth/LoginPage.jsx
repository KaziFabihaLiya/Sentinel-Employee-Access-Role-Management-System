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
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [focused, setFocused]   = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/login', formData);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
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

  return (
    <div style={{
      minHeight:'calc(100vh - 64px)',
      display:'flex',alignItems:'stretch',
      fontFamily:"'DM Sans',sans-serif",
    }}>
      {/* Left panel — brand */}
      <div style={{
        flex:1,background:T.navyMid,
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:'3rem',position:'relative',overflow:'hidden',
      }} className="login-left-panel">

        {/* Grid bg */}
        <div style={{
          position:'absolute',inset:0,
          backgroundImage:`linear-gradient(rgba(0,198,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,198,255,.04) 1px,transparent 1px)`,
          backgroundSize:'50px 50px',pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          width:'500px',height:'500px',borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,198,255,.08) 0%,transparent 65%)',
          pointerEvents:'none',
        }}/>

        <div style={{position:'relative',zIndex:1,textAlign:'center',maxWidth:'400px'}}>
          {/* Logo */}
          <div style={{
            width:'72px',height:'72px',borderRadius:'20px',
            background:T.gradient,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.8rem',
            color:T.navy,margin:'0 auto 1.75rem',
            boxShadow:'0 0 40px rgba(0,198,255,.4)',
          }}>S</div>

          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'2rem',fontWeight:'800',letterSpacing:'-.03em',marginBottom:'.6rem'}}>
            Welcome to <span style={{
              background:T.gradient,WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent',backgroundClip:'text',
            }}>Sentinel</span>
          </h2>
          <p style={{color:T.slate,lineHeight:1.7,fontSize:'.93rem',marginBottom:'2.5rem'}}>
            Guard Every Gateway. Grant with Confidence.
          </p>

          {/* Feature pills */}
          {['Automated ERP Access Control','AI-Powered Role Suggestions','Real-Time Audit Trails'].map(f => (
            <div key={f} style={{
              display:'flex',alignItems:'center',gap:'.75rem',
              background:'rgba(0,198,255,.06)',
              border:`1px solid ${T.border}`,
              borderRadius:'10px',padding:'.7rem 1rem',
              marginBottom:'.6rem',textAlign:'left',
            }}>
              <span style={{color:T.teal,fontSize:'.9rem'}}>✓</span>
              <span style={{color:T.slate,fontSize:'.85rem'}}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width:'100%',maxWidth:'460px',
        background:T.navy,
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:'3rem 2.5rem',
      }}>
        <div style={{width:'100%',maxWidth:'380px'}}>

          <div style={{marginBottom:'2rem'}}>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:'.5rem',
              background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,
              color:T.teal,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',
              textTransform:'uppercase',padding:'.3rem .8rem',borderRadius:'100px',
              marginBottom:'1rem',
            }}>
              <span style={{width:'6px',height:'6px',borderRadius:'50%',background:T.teal,display:'inline-block',animation:'pulse 2s infinite'}}/>
              Secure Login
            </div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:'1.6rem',fontWeight:'800',letterSpacing:'-.03em',marginBottom:'.4rem'}}>
              Sign In
            </h3>
            <p style={{color:T.slate,fontSize:'.88rem'}}>
              Access your Sentinel dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background:T.error,border:`1px solid rgba(239,68,68,.3)`,
              color:T.errorText,padding:'.85rem 1rem',borderRadius:'10px',
              marginBottom:'1.25rem',fontSize:'.87rem',
              display:'flex',alignItems:'center',gap:'.5rem',
              animation:'fadeIn .3s ease',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{marginBottom:'1.1rem'}}>
              <label style={{display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem',letterSpacing:'.02em'}}>
                Email Address
              </label>
              <input
                type="email" name="email" value={formData.email}
                onChange={handleChange}
                onFocus={()=>setFocused('email')}
                onBlur={()=>setFocused('')}
                placeholder="you@company.com" required
                style={inputStyle('email')}
              />
            </div>

            {/* Password */}
            <div style={{marginBottom:'1.75rem'}}>
              <label style={{display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem',letterSpacing:'.02em'}}>
                Password
              </label>
              <div style={{position:'relative'}}>
                <input
                  type={showPw?'text':'password'} name="password" value={formData.password}
                  onChange={handleChange}
                  onFocus={()=>setFocused('password')}
                  onBlur={()=>setFocused('')}
                  placeholder="Enter your password" required
                  style={{...inputStyle('password'),paddingRight:'2.75rem'}}
                />
                <button type="button" onClick={()=>setShowPw(s=>!s)} style={{
                  position:'absolute',right:'.9rem',top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'1rem',
                  display:'flex',alignItems:'center',
                }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%',padding:'.9rem',
              background: loading ? 'rgba(0,198,255,.3)' : T.gradient,
              color:T.navy,border:'none',borderRadius:'10px',
              fontFamily:"'DM Sans',sans-serif",fontSize:'1rem',fontWeight:'700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition:'all .2s ease',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(0,198,255,.3)',
              display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',
            }}>
              {loading && (
                <span style={{
                  width:'16px',height:'16px',border:'2px solid rgba(5,13,31,.3)',
                  borderTopColor:T.navy,borderRadius:'50%',
                  display:'inline-block',animation:'spin 1s linear infinite',
                }}/>
              )}
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p style={{textAlign:'center',marginTop:'1.75rem',fontSize:'.88rem',color:T.slate}}>
            Don't have an account?{' '}
            <Link to="/register" style={{color:T.teal,textDecoration:'none',fontWeight:'600'}}>
              Create one here
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:.5;}50%{opacity:1;}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder{color:#4A6080;}
        @media(max-width:768px){.login-left-panel{display:none!important;}}
      `}</style>
    </div>
  );
};

export default LoginPage;