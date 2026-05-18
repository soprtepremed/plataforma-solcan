import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import React from 'react';

// Importación de las imágenes específicas para esta historia
import img_login from './assets/loginplataforma.png';
import img_inventario from './assets/inventariogeneral.png';
import img_calidad from './assets/accionesdecontroldecalidad.png';
import img_rh from './assets/recursoshumanos.png';
import img_maquila from './assets/bitacorademaquilas.png';
import img_stock from './assets/stockinternodeareas.png';
import img_requisicion from './assets/requisiciondecompra.png';

const CrossFade = ({ frame, duration }) => {
    // Efecto de transición cruzada (opacidad)
    return interpolate(frame, [0, 15, duration - 15, duration], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
};

export const CinematicVideo = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            
            {/* 1. IDENTIDAD (0s - 5s) */}
            <Sequence from={0} durationInFrames={150}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                        src={img_login} 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            transform: `scale(${interpolate(useCurrentFrame(), [0, 150], [1, 1.08])})`,
                            opacity: CrossFade({ frame: useCurrentFrame(), duration: 150 })
                        }} 
                        alt="Login"
                    />
                </AbsoluteFill>
            </Sequence>

            {/* 2. EL ALMACÉN (4.5s - 9.5s) - Superpuesto 15 cuadros para el crossfade */}
            <Sequence from={135} durationInFrames={150}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    <img 
                        src={img_inventario} 
                        style={{ 
                            width: '120%', 
                            height: '100%', 
                            objectFit: 'cover',
                            transform: `scale(1.1) translateX(${interpolate(useCurrentFrame(), [0, 150], [50, -50])}px)`,
                            opacity: CrossFade({ frame: useCurrentFrame(), duration: 150 })
                        }} 
                        alt="Inventario"
                    />
                </AbsoluteFill>
            </Sequence>

            {/* 3. CONTROL Y TRAZABILIDAD - Calidad (9s - 14s) */}
            <Sequence from={270} durationInFrames={150}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                        src={img_calidad} 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            transform: `scale(${interpolate(useCurrentFrame(), [0, 150], [1, 1.15])})`,
                            opacity: CrossFade({ frame: useCurrentFrame(), duration: 150 })
                        }} 
                        alt="Calidad"
                    />
                </AbsoluteFill>
            </Sequence>

            {/* 3.5 CONTROL Y TRAZABILIDAD - RH (13.5s - 18.5s) */}
            <Sequence from={405} durationInFrames={150}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                        src={img_rh} 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            transform: `scale(${interpolate(useCurrentFrame(), [0, 150], [1.1, 1])})`,
                            opacity: CrossFade({ frame: useCurrentFrame(), duration: 150 })
                        }} 
                        alt="RH"
                    />
                </AbsoluteFill>
            </Sequence>

            {/* 4. EL REGISTRO VIVO - Maquila (18s - 23s) */}
            <Sequence from={540} durationInFrames={150}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    <img 
                        src={img_maquila} 
                        style={{ 
                            width: '100%', 
                            height: '120%', 
                            objectFit: 'cover',
                            transform: `translateY(${interpolate(useCurrentFrame(), [0, 150], [-50, 50])}px)`,
                            opacity: CrossFade({ frame: useCurrentFrame(), duration: 150 })
                        }} 
                        alt="Maquila"
                    />
                </AbsoluteFill>
            </Sequence>

            {/* 4.5 EL REGISTRO VIVO - Stock (22.5s - 27.5s) */}
            <Sequence from={675} durationInFrames={150}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                        src={img_stock} 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            transform: `scale(${interpolate(useCurrentFrame(), [0, 150], [1.2, 1])})`,
                            opacity: CrossFade({ frame: useCurrentFrame(), duration: 150 })
                        }} 
                        alt="Stock"
                    />
                </AbsoluteFill>
            </Sequence>

            {/* 5. EL CIERRE DEL SISTEMA (27s - 32s) */}
            <Sequence from={810} durationInFrames={150}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                        src={img_requisicion} 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            transform: `scale(${interpolate(useCurrentFrame(), [0, 150], [1, 1.1])})`,
                            opacity: CrossFade({ frame: useCurrentFrame(), duration: 150 })
                        }} 
                        alt="Requisicion"
                    />
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
