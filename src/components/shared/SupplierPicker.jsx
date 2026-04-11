import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SupplierPicker({ value, onChange }) {
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetchProveedores();
    }, []);

    const fetchProveedores = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('proveedores')
            .select('id, nombre')
            .eq('estatus', 'Activo')
            .order('nombre');
        
        if (!error && data) {
            setProveedores(data);
        }
        setLoading(false);
    };

    const handleQuickAdd = async () => {
        if (!newName.trim()) return;
        setLoading(true);
        // Intentar crear rápido
        const { data, error } = await supabase
            .from('proveedores')
            .insert([{ nombre: newName.trim() }])
            .select('id, nombre')
            .single();
            
        if (!error && data) {
            setProveedores(prev => [...prev, data]);
            onChange(data.id);
            setNewName('');
            setShowQuickAdd(false);
        } else {
            console.error(error);
            alert("Necesario inicializar base de datos primero, o hubo un error.");
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={value || ''} 
                    onChange={e => onChange(e.target.value)}
                >
                    <option value="">-- Sin asignar (N/A) --</option>
                    {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
                <button 
                    type="button" 
                    title="Alta Rápida de Proveedor"
                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                    style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    <span className="material-symbols-rounded">add</span>
                </button>
            </div>
            
            {showQuickAdd && (
                <div style={{ display: 'flex', gap: '8px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px dotted #cbd5e1', animation: 'fadeIn 0.2s' }}>
                    <input 
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--co-blue)' }}
                        placeholder="Nombre comercial..." 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        autoFocus
                    />
                    <button 
                        type="button" 
                        onClick={handleQuickAdd}
                        disabled={loading}
                        style={{ background: 'var(--co-blue, #0f172a)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 12px', cursor: 'pointer' }}
                    >
                        Guardar
                    </button>
                </div>
            )}
        </div>
    );
}
