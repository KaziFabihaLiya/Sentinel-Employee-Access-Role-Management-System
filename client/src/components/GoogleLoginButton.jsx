import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import axiosInstance from '../api/axiosInstance';

const T = {
  navy:'#050D1F',surface:'#0F1E38',
  teal:'#00C6FF',white:'#FFFFFF',slate:'#8DA5C4',
  border:'rgba(0,198,255,0.12)',
  error:'rgba(239,68,68,0.12)',errorText:'#F87171',
};

export const GoogleLoginButton = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    // Check if Google API is loaded
    if (window.google) {
      setGoogleReady(true);
      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
    } else {
      // Fallback if not loaded yet
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        setGoogleReady(true);
      };
      document.head.appendChild(script);
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      // Decode JWT (you can use jwt-decode library or simple split)
      const token = response.credential;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const googleData = JSON.parse(jsonPayload);

      // Send to backend
      const res = await axiosInstance.post('/auth/google', {
        googleId: googleData.sub,
        email: googleData.email,
        displayName: googleData.name,
        photoUrl: googleData.picture,
      });

      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to login with Google. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (googleReady && window.google) {
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', text: 'signin_with' }
      );
    }
  };

  return (
    <div>
      {error && (
        <div
          style={{
            background: T.error,
            border: `1px solid rgba(239,68,68,.3)`,
            color: T.errorText,
            padding: '.85rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            fontSize: '.87rem',
            display: 'flex',
            alignItems: 'center',
            gap: '.5rem',
            animation: 'fadeIn .3s ease',
          }}
        >
          <span>⚠</span> {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          marginTop: '1.5rem',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: T.border }} />
        <span style={{ color: T.slate, fontSize: '.85rem' }}>Or continue with</span>
        <div style={{ flex: 1, height: '1px', background: T.border }} />
      </div>

      <div
        id="google-signin-btn"
        onClick={handleGoogleClick}
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {!googleReady ? (
          <button
            disabled
            style={{
              width: '100%',
              padding: '.8rem',
              background: T.surface,
              color: T.slate,
              border: `1px solid ${T.border}`,
              borderRadius: '10px',
              fontSize: '.9rem',
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            Loading Google Sign-In...
          </button>
        ) : (
          <button
            onClick={handleGoogleClick}
            style={{
              width: '100%',
              padding: '.8rem',
              background: T.white,
              color: T.navy,
              border: 'none',
              borderRadius: '10px',
              fontSize: '.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '.5rem',
            }}
          >
            <img
              src="https://www.gstatic.com/firebaseapp/v8_17_0/images/google-logo.svg"
              alt="Google"
              style={{ width: '18px', height: '18px' }}
            />
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  );
};
