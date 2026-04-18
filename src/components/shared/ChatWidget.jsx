import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './ChatWidget.module.css';

const AREAS = [
  { id: 'hematologia', name: 'Hematología', icon: 'bloodtype' },
  { id: 'quimica_clinica', name: 'Química Clínica', icon: 'science' },
  { id: 'almacen', name: 'Almacén', icon: 'inventory_2' },
  { id: 'admin', name: 'Soporte / Admin', icon: 'support_agent' }
];

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Estados de navegación interna
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedSucursal, setSelectedSucursal] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBySucursal, setUnreadBySucursal] = useState({});
  const [activeSucursales, setActiveSucursales] = useState([]);
  
  const scrollRef = useRef(null);
  const r = user?.role?.toLowerCase() || '';
  const isAdmin = r === 'admin' || r === 'administrador' || r === 'administración';
  const isBranch = r === 'recepcion' || r === 'toma_de_muestra';

  const areaRef = useRef(null);
  const sucursalRef = useRef(null);
  const isOpenRef = useRef(false);

  // --- AUDIO NOTIFICATION (Campana) ---
  const [audioCtx, setAudioCtx] = useState(null);
  const playBell = () => {
    try {
      let ctx = audioCtx;
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioCtx(ctx);
      }
      if (ctx.state === 'suspended') ctx.resume();
      
      const now = ctx.currentTime;
      
      // Función para crear una nota armónica
      const createTone = (freq, vol, decay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + decay);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay);
      };

      // Combinación de frecuencias para efecto de campana (Fundamentales y Armónicos)
      createTone(880, 0.15, 1.2); // Nota principal (A5)
      createTone(1318.51, 0.08, 0.8); // Quinta (E6)
      createTone(1760, 0.05, 0.5); // Octava (A6)
      
    } catch (e) { console.warn("Audio blocked", e); }
  };

  useEffect(() => { areaRef.current = selectedArea; }, [selectedArea]);
  useEffect(() => { sucursalRef.current = selectedSucursal; }, [selectedSucursal]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  const markAsRead = async (specificId, targetCanal = null, targetSuc = null) => {
    if (!user) return;
    try {
      let query = supabase.from('chat_messages').update({ leido: true }).eq('leido', false).neq('emisor_id', user.id);
      
      if (specificId) {
        query = query.eq('id', specificId);
      } else {
        const selArea = targetCanal || areaRef.current;
        const selSuc = targetSuc || sucursalRef.current;

        if (isBranch && selArea) {
          query = query.eq('canal', selArea.id || selArea).eq('sucursal', user.branch || user.sucursal);
        } else if (!isBranch && selSuc) {
          query = query.eq('sucursal', selSuc);
          if (!isAdmin) query = query.eq('canal', r);
        } else {
          return;
        }
      }
      await query;
      fetchInitialUnread(); // Recualcular badge global
    } catch (e) { console.error("Error marking as read:", e); }
  };

  useEffect(() => {
    if (!user) return;

    console.log("Chat: Iniciando suscripción realtime...");
    const channel = supabase
      .channel('chat_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new;
          if (!msg) return;
          const curArea = areaRef.current;
          const curSuc = sucursalRef.current;
          const myRole = user.role?.toLowerCase() || '';
          const mySuc = (user.branch || user.sucursal || '').toLowerCase();
          
          const isFromOther = msg.emisor_id !== user.id;
          let isForCurrentView = false;
          if (isBranch) {
            isForCurrentView = curArea && msg.canal === curArea.id && msg.sucursal.toLowerCase() === mySuc;
          } else {
            const canalCoincide = isAdmin || msg.canal === myRole;
            isForCurrentView = curSuc && msg.sucursal.toLowerCase() === curSuc.toLowerCase() && canalCoincide;
          }

          if (isOpenRef.current && isForCurrentView) {
              setMessages(prev => {
                const isDuplicate = prev.some(m => 
                  m.id === msg.id || 
                  (m.contenido === msg.contenido && m.emisor_id === msg.emisor_id && !m.id)
                );
                if (isDuplicate) return prev.map(m => (!m.id && m.contenido === msg.contenido && m.emisor_id === msg.emisor_id) ? msg : m);
                return [...prev, msg];
              });
              if (isFromOther) {
                playBell();
                markAsRead(msg.id);
              }
          } else {
              const isMsgForMe = isAdmin || msg.canal === myRole || (isBranch && msg.sucursal.toLowerCase() === mySuc);
              if (isMsgForMe && isFromOther) {
                setUnreadCount(prev => prev + 1);
                const key = isBranch ? msg.canal : msg.sucursal;
                setUnreadBySucursal(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
                playBell();
                showSystemNotification(msg);
              }
          }
        }
        
        if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }

        if (!isBranch) fetchActiveSucursales();
      })
      .subscribe((status) => {
        console.log(`Chat: Estado de suscripción: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error("Chat: Error en la conexión realtime. Es posible que la tabla no tenga habilitado Realtime en Supabase.");
        }
      });

    return () => { 
      console.log("Chat: Removiendo suscripción...");
      supabase.removeChannel(channel); 
    };
  }, [user]);

  useEffect(() => {
    if (isOpen && !isBranch) fetchActiveSucursales();
  }, [isOpen]);

  // --- NOTIFICACIONES DEL SISTEMA ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showSystemNotification = (msg) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Nuevo mensaje de ${msg.emisor_nombre}`, {
        body: msg.contenido,
        icon: '/favicon.ico' // Opcional: ruta a tu icono
      });
    }
  };

  // --- AUTO-CLEANUP (Borra mensajes > 24h) ---
  useEffect(() => {
    const cleanup = async () => {
      try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from('chat_messages').delete().lt('created_at', yesterday);
        if (error) console.warn("Cleanup error:", error.message);
        else console.log("Chat: Limpieza de mensajes antiguos completada.");
      } catch (e) { console.error("Cleanup failed:", e); }
    };
    if (user) {
      cleanup();
      fetchInitialUnread();
    }
  }, [user]);

  const fetchInitialUnread = async () => {
    if (!user) return;
    try {
      let query = supabase.from('chat_messages').select('id', { count: 'exact' }).eq('leido', false).neq('emisor_id', user.id);
      
      if (isBranch) {
        query = query.eq('sucursal', user.branch || user.sucursal);
      } else {
        if (!isAdmin) query = query.eq('canal', r);
      }

      const { count } = await query;
      setUnreadCount(count || 0);

      // Cargar desglosado por (sucursal para técnicos | area para sucursales)
      const { data } = await supabase.from('chat_messages').select('sucursal, canal').eq('leido', false).neq('emisor_id', user.id);
      if (data) {
        const counts = {};
        data.forEach(m => { 
          const key = isBranch ? m.canal : m.sucursal;
          counts[key] = (counts[key] || 0) + 1; 
        });
        setUnreadBySucursal(counts);
      }
    } catch (e) { console.error("Error fetching unread:", e); }
  };

  useEffect(() => {
    if (selectedArea || selectedSucursal) {
      // 1. LIMPIEZA TOTAL OPTIMISTA (Local e instantánea)
      const key = isBranch ? (selectedArea?.id || selectedArea) : selectedSucursal;
      
      setUnreadBySucursal(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });

      // Recalcular contador global restando lo que acabamos de "leer" localmente
      setUnreadCount(prev => Math.max(0, prev - (unreadBySucursal[key] || 0)));
      
      // 2. SINCRONIZACIÓN CON BASE DE DATOS
      markAsRead(null, selectedArea?.id || selectedArea, selectedSucursal); 
      fetchMessages();
    }
  }, [selectedArea, selectedSucursal, isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchActiveSucursales = async () => {
    let query = supabase.from('chat_messages').select('sucursal, created_at');
    if (!isAdmin) query = query.eq('canal', r);
    const { data } = await query.order('created_at', { ascending: false });
    if (data) {
      const unique = [...new Set(data.map(m => m.sucursal).filter(Boolean))];
      setActiveSucursales(unique);
    }
  };

  const fetchMessages = async () => {
    // Obtenemos los últimos 50 mensajes de forma descendente para tener los más recientes
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(50);
    
    if (isBranch) {
      if (!selectedArea) return;
      query = query.eq('canal', selectedArea.id).eq('sucursal', user.branch || user.sucursal);
    } else {
      if (!selectedSucursal) return;
      query = query.eq('sucursal', selectedSucursal);
      if (!isAdmin) query = query.eq('canal', r);
    }

    const { data } = await query;
    if (data) {
      // Los invertimos para que se vean en orden cronológico (viejo -> nuevo)
      setMessages(data.reverse());
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Lógica de destino: 
    // - Si es sucursal: va al área seleccionada.
    // - Si es administrador/técnico: 
    //   - Si el admin está respondiendo en un hilo, intentamos usar el canal de ese hilo (Ej: 'hematologia')
    //   - Si no hay mensajes previos o no es admin, usa su propio rol.
    const lastMsgInThread = messages[messages.length - 1];
    const canalDestino = isBranch ? selectedArea?.id : (isAdmin && lastMsgInThread ? lastMsgInThread.canal : r);
    const sucursalDestino = isBranch ? (user.branch || user.sucursal) : selectedSucursal;

    const msgObj = {
      emisor_id: user.id,
      emisor_nombre: user.name,
      canal: canalDestino,
      sucursal: sucursalDestino,
      contenido: newMessage.trim(),
      leido: false,
      created_at: new Date().toISOString()
    };

    // --- ACTUALIZACIÓN OPTIMISTA (INSTANTÁNEA) ---
    setMessages(prev => [...prev, msgObj]);
    setNewMessage('');

    const { error } = await supabase.from('chat_messages').insert([msgObj]);
    if (error) {
       alert('No se pudo enviar: ' + error.message);
       // Opcional: remover el mensaje optimista si falló de forma permanente
    }
  };

  if (!user) return null;

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
              <span className="material-symbols-rounded">
                {isBranch ? (selectedArea?.icon || 'forum') : (selectedSucursal ? 'location_on' : 'inbox')}
              </span>
              <span>{selectedArea?.name || selectedSucursal || (isBranch ? 'Chat Solcan' : 'Bandeja de Entrada')}</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </header>

          <main className={styles.body} ref={scrollRef}>
            {isBranch && !selectedArea && (
              <div className={styles.areaSelector}>
                <p>¿Con qué área necesitas comunicarte?</p>
                {AREAS.map(area => (
                  <button key={area.id} className={styles.areaItem} onClick={() => setSelectedArea(area)}>
                    <span className="material-symbols-rounded">{area.icon}</span>
                    <div className={styles.areaInfo}><strong>{area.name}</strong><span>Consulta directa</span></div>
                    {unreadBySucursal[area.id] > 0 && <div className={styles.unreadBadge}>{unreadBySucursal[area.id]}</div>}
                  </button>
                ))}
              </div>
            )}

            {!isBranch && !selectedSucursal && (
              <div className={styles.areaSelector}>
                <p>Aspirantes a consulta (Sucursales)</p>
                {activeSucursales.length === 0 ? <p className={styles.empty}>No hay mensajes entrantes.</p> :
                  activeSucursales.map(suc => (
                    <button key={suc} className={styles.areaItem} onClick={() => setSelectedSucursal(suc)}>
                      <span className="material-symbols-rounded">store</span>
                      <div className={styles.areaInfo}><strong>{suc}</strong><span>Ver conversación</span></div>
                      {unreadBySucursal[suc] > 0 && <div className={styles.unreadBadge}>{unreadBySucursal[suc]}</div>}
                      <span className="material-symbols-rounded">chevron_right</span>
                    </button>
                  ))
                }
              </div>
            )}

            {(selectedArea || selectedSucursal) && (
              <div className={styles.timeline}>
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={`${styles.msgRow} ${msg.emisor_id === user.id ? styles.own : ''}`}>
                    <div className={styles.msgBubble}>
                      {msg.emisor_id !== user.id && <small className={styles.senderName}>{msg.emisor_nombre}</small>}
                      <p>{msg.contenido}</p>
                      <small className={styles.msgTime}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        {msg.emisor_id == user?.id && (
                          <span className="material-symbols-rounded" style={{ 
                            fontSize: '15px', 
                            marginLeft: '4px',
                            color: msg.leido ? '#2af598' : '#94a3b8',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            verticalAlign: 'middle'
                          }}>
                            done_all
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
            <form className={styles.footer} onSubmit={sendMessage}>
              <input type="text" placeholder="Escribe tu respuesta..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
              <button type="submit" disabled={!newMessage.trim()}><span className="material-symbols-rounded">send</span></button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
