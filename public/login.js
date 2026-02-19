const $ = (s) => document.querySelector(s);

function setMsg(msg, kind=''){
  const el = $('#msg');
  el.textContent = msg || '';
  el.className = 'msg' + (kind ? ' ' + kind : '');
}

async function api(path, { method='GET', body } = {}){
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try{ data = text ? JSON.parse(text) : null; }catch{ data = { raw: text }; }
  if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

let lastEmail = null;

$('#requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');
  $('#devCodeWrap').style.display = 'none';

  const fd = new FormData(e.target);
  const email = String(fd.get('email') || '').trim();
  const bootstrapSecret = String(fd.get('bootstrapSecret') || '').trim();

  try{
    const data = await api('/api/auth.js?action=request', { method:'POST', body: { email, bootstrapSecret: bootstrapSecret || undefined } });
    lastEmail = email;

    if(data?.devCode){
      $('#devCode').textContent = data.devCode;
      $('#devCodeWrap').style.display = '';
      setMsg('Code generated. Enter it below to continue.');
    }else{
      setMsg('If this email is registered, a code has been sent (email delivery pending). If you are Admin, use Bootstrap Secret to display code.');
    }

    $('#verifyForm').style.display = '';
    $('#verifyForm input[name=code]').focus();
  }catch(err){
    setMsg(err.message);
  }
});

$('#verifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');
  const fd = new FormData(e.target);
  const code = String(fd.get('code') || '').trim();
  const email = lastEmail;

  try{
    const data = await api('/api/auth.js?action=verify', { method:'POST', body: { email, code } });
    // token is also set as HttpOnly cookie; keep a local copy for Authorization header fallbacks.
    localStorage.setItem('gccs_token', data.token);
    window.location.href = '/';
  }catch(err){
    setMsg(err.message);
  }
});
