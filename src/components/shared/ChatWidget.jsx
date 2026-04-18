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
  const [activeSucursales, setActiveSucursales] = useState([]);
  
  const scrollRef = useRef(null);
  const r = user?.role?.toLowerCase() || '';
  const isAdmin = r === 'admin' || r === 'administrador' || r === 'administración';
  const isBranch = r === 'recepcion' || r === 'toma_de_muestra';

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const msg = payload.new;
        const r = user.role?.toLowerCase() || '';
        const isAdmin = r === 'admin' || r === 'administrador' || r === 'administración';
        
        // Determinar si el mensaje pertenece a lo que estamos viendo ahora
        const isCurrentView = (selectedArea && msg.canal === selectedArea.id) || 
                            (selectedSucursal && msg.sucursal === selectedSucursal);
        
        const isForMe = isAdmin || (msg.canal === r) || (msg.sucursal === (user.branch || user.sucursal));

        if (isForMe) {
          // Si el mensaje es de OTRO usuario y es para mi vista actual, lo inyectamos
          if (isOpen && isCurrentView && msg.emisor_id !== user.id) {
              setMessages(prev => [...prev, msg]);
          }
          // Si no tengo el chat abierto, subimos el contador de pendientes (solo si no es mio)
          if (!isOpen && msg.emisor_id !== user.id) setUnreadCount(prev => prev + 1);
          
          if (!isBranch) fetchActiveSucursales();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isOpen, selectedArea, selectedSucursal]);

  useEffect(() => {
    if (isOpen && !isBranch) fetchActiveSucursales();
  }, [isOpen]);

  useEffect(() => {
    if (selectedArea || selectedSucursal) fetchMessages();
  }, [selectedArea, selectedSucursal]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchActiveSucursales = async () => {
    let query = supabase.from('chat_messages').select('sucursal, created_at');
    if (!isAdmin) query = query.eq('canal', r);
    const { data } = await query.order('created_at', { ascending: false });
    if (data) {
      const unique = [...new Set(data.map(m => m.sucursal))];
      setActiveSucursales(unique);
    }
  };

  const fetchMessages = async () => {
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(50);
    
    if (isBranch) {
      // Rama: ve solo sus mensajes con el área seleccionada
      if (!selectedArea) return;
      query = query.eq('canal', selectedArea.id).eq('sucursal', user.branch || user.sucursal);
    } else {
      // Área/Admin: ve mensajes con la sucursal seleccionada
      if (!selectedSucursal) return;
      query = query.eq('sucursal', selectedSucursal);
      if (!isAdmin) query = query.eq('canal', r);
    }

    const { data } = await query;
    if (data) setMessages(data);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const canalDestino = isBranch ? selectedArea?.id : r;
    const sucursalDestino = isBranch ? (user.branch || user.sucursal) : selectedSucursal;

    const msgObj = {
      emisor_id: user.id,
      emisor_nombre: user.name,
      canal: canalDestino,
      sucursal: sucursalDestino,
      contenido: newMessage.trim(),
      created_at: new Date().toISOString()
    };

    // --- ACTUALIZACIÓN OPTIMISTA (INSTANTÁNEA) ---
    setMessages(prev => [...prev, msgObj]);
    setNewMessage('');

    const { error } = await supabase.from('chat_messages').insert([msgObj]);
    if (error) {
       // Si falló, lo removemos de la vista (opcional, pero mejor avisar)
       alert('No se pudo enviar: ' + error.message);
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
                      <small className={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
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
