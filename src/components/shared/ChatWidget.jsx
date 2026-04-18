import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './ChatWidget.module.css';

const AREAS = [
  { id: 'hematologia', name: 'Hematología', icon: 'bloodtype' },
  { id: 'quimica_clinica', name: 'Química Clínica', icon: 'chemistry' },
  { id: 'almacen', name: 'Almacén', icon: 'inventory_2' },
  { id: 'admin', name: 'Soporte / Admin', icon: 'support_agent' }
];

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Suscribirse a mensajes nuevos
    const channel = supabase
      .channel('chat_global')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages' 
      }, payload => {
        const msg = payload.new;
        
        // Si el mensaje es para mi área o mi sucursal, lo agregamos
        const isForMe = (msg.canal === user.role?.toLowerCase()) || 
                      (user.role === 'admin') ||
                      (msg.sucursal === user.branch && selectedArea?.id === msg.canal);

        if (isForMe) {
          setMessages(prev => [...prev, msg]);
          if (!isOpen) setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen, selectedArea]);

  useEffect(() => {
    if (selectedArea) {
      fetchMessages();
    }
  }, [selectedArea]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    // Cargar últimos 50 mensajes de este canal/sucursal
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('canal', selectedArea.id)
      .order('created_at', { ascending: true })
      .limit(50);
    
    // Si no soy admin ni el área técnica, solo veo mis mensajes de sucursal
    const r = user.role?.toLowerCase();
    if (r !== 'admin' && r !== selectedArea.id) {
       query = query.eq('sucursal', user.branch || user.sucursal);
    }

    const { data } = await query;
    if (data) setMessages(data);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedArea) return;

    const msgObj = {
      emisor_id: user.id,
      emisor_nombre: user.name,
      canal: selectedArea.id,
      sucursal: user.branch || user.sucursal || 'Matriz',
      contenido: newMessage.trim()
    };

    const { error } = await supabase.from('chat_messages').insert([msgObj]);
    if (!error) {
      setNewMessage('');
    }
  };

  if (!user) return null;

  return (
    <div className={`${styles.chatWrapper} ${isOpen ? styles.expanded : ''}`}>
      {/* Burbuja Flotante */}
      {!isOpen && (
        <button className={styles.fab} onClick={() => { setIsOpen(true); setUnreadCount(0); }}>
          <span className="material-symbols-rounded">chat</span>
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div className={styles.window}>
          <header className={styles.header}>
            {!selectedArea ? (
              <div className={styles.headerTitle}>
                <span className="material-symbols-rounded">forum</span>
                <span>Chat Solcan</span>
              </div>
            ) : (
              <div className={styles.headerTitle}>
                <button className={styles.backBtn} onClick={() => setSelectedArea(null)}>
                  <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <span className="material-symbols-rounded">{selectedArea.icon}</span>
                <span>{selectedArea.name}</span>
              </div>
            )}
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </header>

          <main className={styles.body} ref={scrollRef}>
            {!selectedArea ? (
              <div className={styles.areaSelector}>
                <p>¿Con qué área necesitas comunicarte?</p>
                {AREAS.map(area => (
                  <button 
                    key={area.id} 
                    className={styles.areaItem}
                    onClick={() => setSelectedArea(area)}
                  >
                    <span className="material-symbols-rounded">{area.icon}</span>
                    <div className={styles.areaInfo}>
                      <strong>{area.name}</strong>
                      <span>Enviar mensaje al área</span>
                    </div>
                    <span className="material-symbols-rounded">chevron_right</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.timeline}>
                {messages.length === 0 && (
                   <div className={styles.empty}>Inicia la conversación con {selectedArea.name}</div>
                )}
                {messages.map((msg, i) => (
                  <div 
                    key={msg.id || i} 
                    className={`${styles.msgRow} ${msg.emisor_id === user.id ? styles.own : ''}`}
                  >
                    <div className={styles.msgBubble}>
                      {msg.emisor_id !== user.id && <small className={styles.senderName}>{msg.emisor_nombre} ({msg.sucursal})</small>}
                      <p>{msg.contenido}</p>
                      <small className={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {selectedArea && (
            <form className={styles.footer} onSubmit={sendMessage}>
              <input 
                type="text" 
                placeholder="Escribe un mensaje..." 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <button type="submit" disabled={!newMessage.trim()}>
                <span className="material-symbols-rounded">send</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
