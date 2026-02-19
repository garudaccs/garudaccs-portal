const $ = (s) => document.querySelector(s);

function setMsg(msg, kind=''){
  const el = $('#msg');
  el.textContent = msg || '';
  el.className = 'msg' + (kind ? ' ' + kind : '');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');

  const fd = new FormData(e.target);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '').trim();

  try{
    const res = await fetch('/api/auth.js?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    localStorage.setItem('gccs_token', data.token);
    window.location.href = '/';
  }catch(err){
    setMsg(err.message);
  }
});
