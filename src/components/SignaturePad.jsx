import React, { useRef, useState, useEffect } from 'react';
import styles from './SignaturePad.module.css';

export default function SignaturePad({ onSave, onClear }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Ajustar resolución para pantallas de alta densidad (Retina, etc.)
        const ratio = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.scale(ratio, ratio);
        
        // Estilo del trazo más fino y profesional
        ctx.strokeStyle = "#0B2B5E"; // Azul técnico Solcan
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }, []);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const { x, y } = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        onSave(canvas.toDataURL('image/png'));
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onClear();
    };

    return (
        <div className={styles.sigPadContainer}>
            <div className={styles.sigPadHeader}>
                <span><span className="material-symbols-rounded">edit_square</span> Firma Responsable</span>
                <button type="button" onClick={clear} className={styles.clearSigBtn}>Limpiar</button>
            </div>
            <canvas 
                ref={canvasRef}
                className={styles.canvas}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                style={{ touchAction: 'none' }}
            />
            <p className={styles.sigHint}>Capture su rúbrica sobre la línea</p>
        </div>
    );
}
