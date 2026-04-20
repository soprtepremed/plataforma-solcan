import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './ChatWidget.module.css';

const AREAS = [
  { id: 'hematologia', name: 'Hematología', icon: 'biotech' },
  { id: 'quimica_clinica', name: 'Química Clínica', icon: 'science' },
  { id: 'urianalisis', name: 'Urianálisis', icon: 'medication' },
  { id: 'microbiologia', name: 'Microbiología', icon: 'coronavirus' },
  { id: 'serologia', name: 'Serología', icon: 'bloodtype' },
  { id: 'almacen', name: 'Almacén e Insumos', icon: 'inventory_2' },
  { id: 'admin', name: 'Soporte / Central', icon: 'support_agent' }
];

const cleanSuc = n => (n || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sucursales');
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedSucursal, setSelectedSucursal] = useState(null);
  const [sucursalesDb, setSucursalesDb] = useState([]);
  const [chatType, setChatType] = useState('sucursal-area'); 
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBySucursal, setUnreadBySucursal] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [audioCtx, setAudioCtx] = useState(null);
  
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const areaRef = useRef(null);
  const sucursalRef = useRef(null);
  const isOpenRef = useRef(false);
  const chatTypeRef = useRef('sucursal-area');

  const r = (user?.role || '').toLowerCase().trim();
  const isQuimico = r.includes('quimico') || r.includes('químico');
  const isAdmin = r === 'admin' || r === 'administrador' || r === 'administración' || r.includes('logistica');
  const isAreaStaff = AREAS.some(area => area.id === r);
  const isBranch = !!(user?.branch || user?.sucursal) && !isAdmin && !isAreaStaff;
  const isAuthorized = (isAdmin || isBranch || isAreaStaff) && !isQuimico;

  useEffect(() => {
    areaRef.current = selectedArea; sucursalRef.current = selectedSucursal;
    isOpenRef.current = isOpen; chatTypeRef.current = chatType;
  }, [selectedArea, selectedSucursal, isOpen, chatType]);

  const playBell = () => {
    try {
      let ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioCtx) setAudioCtx(ctx);
      if (ctx.state === 'suspended') ctx.resume();
      const playNote = (f, s, d) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, ctx.currentTime+s);
        g.gain.setValueAtTime(0, ctx.currentTime+s);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime+s+0.01);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+s+d);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime+s); o.stop(ctx.currentTime+s+d);
      };
      playNote(880, 0, 0.1); playNote(1174.66, 0.08, 0.2);
    } catch(e){}
  };

  useEffect(() => {
    if (!user || !isAuthorized || isBranch) return;
    const fetchSucs = async () => {
      const { data } = await supabase.from('empleados').select('sucursal');
      const excludeKeywords = ["MATRIZ", "CENTRAL", "OFICINA", "TRANSPORTE", "ADMIN", "TUXTLA"];
      const sSet = new Set();
      data?.forEach(e => { if (e.sucursal) { const upper = e.sucursal.toUpperCase(); if (!excludeKeywords.some(k => upper.includes(k))) sSet.add(e.sucursal); } });
      setSucursalesDb(Array.from(sSet).sort().map(s => ({ id: s, name: s })));
    };
    fetchSucs();
  }, [user, isAuthorized, isBranch]);

  const getUnreadKey = (msg) => {
    if (msg.sucursal.startsWith('INTER:')) {
      const parts = msg.sucursal.replace('INTER:', '').split('-');
      return parts.find(p => p !== r) || 'admin';
    }
    return isBranch ? msg.canal : msg.sucursal;
  };

  const markAsRead = async (id, tCanal, tSuc) => {
    if (!user) return;
    try {
      let q = supabase.from('chat_messages').update({ leido: true }).eq('leido', false).neq('emisor_id', user.id);
      if (id) q = q.eq('id', id); else {
        const sA = tCanal || areaRef.current; const sS = tSuc || sucursalRef.current;
        if (isBranch && sA) q = q.eq('canal', sA.id || sA).eq('sucursal', user.branch || user.sucursal);
        else if (!isBranch && sS) {
          if (chatTypeRef.current === 'area-area') q = q.eq('sucursal', `INTER:${[r, cleanSuc(sS)].sort().join('-')}`);
          else q = q.eq('sucursal', sS).eq('canal', r);
        } else return;
      }
      await q; fetchInitialUnread();
    } catch (e) {}
  };

  const fetchInitialUnread = async () => {
    if (!user || !isAuthorized) return;
    let q = supabase.from('chat_messages').select('id, sucursal, canal, emisor_id').eq('leido', false).neq('emisor_id', user.id);
    if (isBranch) q = q.eq('sucursal', user.branch || user.sucursal);
    else if (!isAdmin) q = q.or(`canal.eq.${r},sucursal.ilike.%${r}%`);
    const { data } = await q;
    if (data) {
      setUnreadCount(data.length); const c = {}; data.forEach(m => { const k = getUnreadKey(m); c[k] = (c[k] || 0)+1; });
      setUnreadBySucursal(c);
    }
  };

  useEffect(() => {
    if (!user || !isAuthorized) return;
    fetchInitialUnread();
    const sub = supabase.channel('chat_vistos_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, p => {
        if (p.eventType === 'INSERT') {
          const m = p.new;
          let forMe = false;
          if (isBranch) forMe = cleanSuc(m.sucursal) === cleanSuc(user.branch || user.sucursal);
          else forMe = isAdmin || m.canal === r || m.sucursal.includes(r);
          
          if (forMe || m.emisor_id === user.id) {
            let cur = false; const cS = cleanSuc(sucursalRef.current);
            if (isBranch) cur = (areaRef.current?.id || areaRef.current) === m.canal;
            else if (chatTypeRef.current === 'area-area') cur = m.sucursal === `INTER:${[r, cS].sort().join('-')}`;
            else cur = cS === cleanSuc(m.sucursal) && m.canal === r;
            
            if (isOpenRef.current && cur) {
              setMessages(prev => {
                const already = prev.find(x => x.id === m.id); if (already) return prev;
                const tempIdx = prev.findIndex(x => !x.id && x.contenido === m.contenido && x.emisor_id === m.emisor_id);
                if (tempIdx !== -1) { const n = [...prev]; n[tempIdx] = m; return n; }
                return [...prev, m];
              });
              if (m.emisor_id !== user.id) markAsRead(m.id);
            } else if (m.emisor_id !== user.id && forMe) {
              playBell();
              setUnreadCount(v => v + 1); const k = getUnreadKey(m); setUnreadBySucursal(v => ({ ...v, [k]: (v[k] || 0)+1 }));
            }
          }
        }
        if (p.eventType === 'UPDATE') {
          // Fusionar cambios (leido: true) sin perder datos existentes
          setMessages(v => v.map(x => x.id === p.new.id ? { ...x, ...p.new } : x));
          fetchInitialUnread();
        }
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [user, isAuthorized]);

  const fetchMessages = async () => {
    const cS = cleanSuc(selectedSucursal);
    let q = supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(60);
    if (isBranch) { if(!selectedArea) return; q = q.eq('canal', (selectedArea.id || selectedArea).toLowerCase()).ilike('sucursal', `%${cleanSuc(user.branch || user.sucursal)}%`); }
    else { if (chatType === 'area-area') q = q.eq('sucursal', `INTER:${[r, cS].sort().join('-')}`); else { if(!selectedSucursal) return; q = q.ilike('sucursal', `%${cS}%`).eq('canal', r); } }
    const { data } = await q; if(data) setMessages(data.reverse());
  };

  useEffect(() => {
    if ((selectedArea || selectedSucursal) && isAuthorized) {
      const key = isBranch ? (selectedArea?.id || selectedArea) : selectedSucursal;
      setUnreadBySucursal(p => { const n = {...p}; delete n[key]; return n; });
      markAsRead(null, selectedArea?.id || selectedArea, selectedSucursal);
      fetchMessages();
    }
  }, [selectedArea, selectedSucursal, isOpen, isAuthorized]);

  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleFile = (e) => {
    const f = e.target.files[0]; if(!f) return;
    if (f.size > 10 * 1024 * 1024) return alert("Máximo 10MB");
    setStagedFile(f); if (f.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(f)); else setPreviewUrl(null);
  };

  const sendMessage = async (e) => {
    e.preventDefault(); if(!newMessage.trim() && !stagedFile) return;
    const cS = cleanSuc(selectedSucursal); let cD, sD;
    if (isBranch) { cD = (selectedArea?.id || selectedArea).toLowerCase(); sD = user.branch || user.sucursal; }
    else { if (chatType === 'area-area') { sD = `INTER:${[r, cS].sort().join('-')}`; cD = 'INTER'; } else { cD = r; sD = selectedSucursal; } }
    let fD = { url: null, type: null, name: null };
    if (stagedFile) {
      setIsUploading(true);
      const path = `attachments/${Date.now()}_${stagedFile.name}`;
      await supabase.storage.from('chat-attachments').upload(path, stagedFile);
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path);
      fD = { url: publicUrl, type: stagedFile.type.startsWith('image/') ? 'image' : 'document', name: stagedFile.name };
    }
    const msg = { emisor_id: user.id, emisor_nombre: user.name, canal: cD, sucursal: sD, contenido: newMessage.trim() || `Archivo: ${stagedFile.name}`, file_url: fD.url, file_type: fD.type, file_name: fD.name, leido: false, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, msg]); setNewMessage(''); setStagedFile(null); setPreviewUrl(null); setIsUploading(false);
    await supabase.from('chat_messages').insert([msg]);
  };

  if (!user || !isAuthorized) return null;

  return (
    <div className={styles.chatWrapper}>
      {!isOpen && (
        <button className={styles.fab} onClick={() => setIsOpen(true)}>
          <span className="material-symbols-rounded">chat</span>
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </button>
      )}
      {isOpen && (
        <div className={styles.window}>
          <header className={styles.header}>
            <div className={styles.headerTitle}>
              {(selectedArea || selectedSucursal) && (
                <button className={styles.backBtn} onClick={() => { setSelectedArea(null); setSelectedSucursal(null); setMessages([]); }}>
                  <span className="material-symbols-rounded">arrow_back</span>
                </button>
              )}
              <span className="material-symbols-rounded">{isBranch ? (selectedArea?.icon || 'forum') : (selectedSucursal ? (chatType==='area-area'?'group_work':'store') : 'inbox')}</span>
              <span>{selectedArea?.name || selectedSucursal || 'Bandeja de Entrada'}</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}><span className="material-symbols-rounded">close</span></button>
          </header>
          <main className={styles.body} ref={scrollRef}>
            {isBranch && !selectedArea && (
              <div className={styles.areaSelector}>
                <p>¿Con qué área necesitas comunicarte?</p>
                {AREAS.map(a => (
                  <button key={a.id} className={styles.areaItem} onClick={() => setSelectedArea(a)}>
                    <span className="material-symbols-rounded">{a.icon}</span>
                    <div className={styles.areaInfo}><strong>{a.name}</strong><span>Consulta</span></div>
                    {unreadBySucursal[a.id] > 0 && <div className={styles.unreadBadge}>{unreadBySucursal[a.id]}</div>}
                  </button>
                ))}
              </div>
            )}
            {!isBranch && !selectedSucursal && (
              <div className={styles.areaSelector}>
                <div className={styles.tabContainer}>
                  <button className={activeTab === 'sucursales' ? styles.tabActive : styles.tab} onClick={() => { setActiveTab('sucursales'); setChatType('sucursal-area'); }}>SUCURSALES</button>
                  <button className={activeTab === 'areas' ? styles.tabActive : styles.tab} onClick={() => { setActiveTab('areas'); setChatType('area-area'); }}>ÁREAS</button>
                </div>
                <div className={styles.areaList}>
                  {activeTab === 'sucursales' ? sucursalesDb.map(s => (
                    <button key={s.id} className={styles.areaItem} onClick={() => { setSelectedSucursal(s.id); setChatType('sucursal-area'); }}>
                      <span className="material-symbols-rounded" style={{color:'#64748b'}}>store</span>
                      <div className={styles.areaInfo}><strong>{s.name}</strong><span>Chat sede</span></div>
                      {unreadBySucursal[s.id] > 0 && <div className={styles.unreadBadge}>{unreadBySucursal[s.id]}</div>}
                    </button>
                  )) : AREAS.filter(a => a.id !== r).map(a => (
                    <button key={a.id} className={styles.areaItem} onClick={() => { setSelectedArea(a); setSelectedSucursal(a.id); setChatType('area-area'); }}>
                      <span className="material-symbols-rounded">{a.icon}</span>
                      <div className={styles.areaInfo}><strong>{a.name}</strong><span>Interno</span></div>
                      {unreadBySucursal[a.id] > 0 && <div className={styles.unreadBadge}>{unreadBySucursal[a.id]}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(selectedArea || selectedSucursal) && (
              <div className={styles.timeline}>
                {messages.length === 0 && <p className={styles.empty}>Sin mensajes.</p>}
                {messages.map((m, i) => (
                  <div key={m.id || i} className={`${styles.msgRow} ${m.emisor_id === user.id ? styles.own : ''}`}>
                    <div className={styles.msgBubble}>
                      {m.emisor_id !== user.id && <small className={styles.senderName}>{m.emisor_nombre}</small>}
                      {m.file_url && (
                        <div className={styles.fileContainer}>
                          {m.file_type === 'image' ? <img src={m.file_url} className={styles.chatImage} onClick={() => window.open(m.file_url, '_blank')} /> : 
                          <a href={m.file_url} target="_blank" rel="noreferrer" className={styles.documentLink}>
                            <span className="material-symbols-rounded">description</span>
                            <div className={styles.docInfo}><span>{m.file_name || 'Archivo'}</span><small>Clic para ver</small></div>
                          </a>}
                        </div>
                      )}
                      {m.contenido && <p className={styles.textContent}>{m.contenido}</p>}
                      <small className={styles.msgTime}>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        {m.emisor_id === user.id && (
                          <span className="material-symbols-rounded" style={{fontSize:'16px', color: m.leido ? '#2af598' : 'rgba(255,255,255,0.4)', marginLeft:'4px'}}>
                            {m.leido ? 'done_all' : 'check'}
                          </span>
                        )}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
          {(selectedArea || selectedSucursal) && (
            <form className={styles.chatFooter} onSubmit={sendMessage}>
              <input type="file" ref={fileInputRef} onChange={handleFile} style={{display:'none'}} />
              <button type="button" className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={isUploading}><span className="material-symbols-rounded">attach_file</span></button>
              <div className={styles.inputWrapper}>
                {stagedFile && (
                  <div className={styles.filePreviewBar}>
                    {previewUrl? <img src={previewUrl} className={styles.previewThumb}/> : <div className={styles.docPreview}><span className="material-symbols-rounded">description</span><span>{stagedFile.name}</span></div>}
                    <button type="button" className={styles.removeFileBtn} onClick={()=>{setStagedFile(null);setPreviewUrl(null);}}><span className="material-symbols-rounded">close</span></button>
                  </div>
                )}
                <input type="text" placeholder="Mensaje..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} disabled={isUploading}/>
              </div>
              <button type="submit" disabled={isUploading||(!newMessage.trim()&&!stagedFile)}><span className="material-symbols-rounded">{isUploading?'sync':'send'}</span></button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
