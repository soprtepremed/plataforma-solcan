import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, Audio } from 'remotion';
import React from 'react';

// Importación de música
import music from './assets/musica.mp3';

// Importación de imágenes originales
import img_login from './assets/loginplataforma.png';
import img_bienvenida from './assets/bienvenidaplataforma.png';
import img_dashboard from './assets/dashboardprincipal.png';
import img_catalogo from './assets/catalogodematereriales.png';
import img_inventario from './assets/inventariogeneral.png';
import img_almacen from './assets/vistageneralalmacencentral.png';
import img_solicitud from './assets/solicitudmaterial.png';
import img_vale from './assets/ejemplodevalesurtido.png';
import img_requisicion from './assets/requisiciondecompra.png';
import img_stock_interno from './assets/stockinternodeareas.png';
import img_resumen_stock from './assets/resumenstockenareas.png';
import img_maquilas from './assets/bitacorademaquilas.png';
import img_calidad from './assets/accionesdecontroldecalidad.png';
import img_temperatura from './assets/controldetemperaturas.png';
import img_params1 from './assets/parametrosderivados.png';
import img_params2 from './assets/parametrosderivados2.png';

// Importación de imágenes de Chat y RH
import img_chat1 from './assets/chateneivo.png';
import img_chat2 from './assets/chatentreareas.png';
import img_chat3 from './assets/chatenvivo.png';
import img_chat_conv from './assets/conversacionchat.png';
import img_rh from './assets/recursoshumanos.png';
import img_rh2 from './assets/recursoshumanosl2.png';

// NUEVA IMAGEN DE CIERRE
import img_login_cierre from './assets/logincierre.png';

const images = [
    img_login, img_bienvenida, img_dashboard, img_catalogo,
    img_inventario, img_almacen, img_solicitud, img_vale,
    img_requisicion, img_stock_interno, img_resumen_stock, img_maquilas,
    img_calidad, img_temperatura, img_params1, img_params2,
    img_chat1, img_chat2, img_chat3, img_chat_conv, img_rh, img_rh2, img_login_cierre
];

// Efecto de Flash Blanco para transiciones
const Flash = ({ frame }) => {
    const opacity = interpolate(frame, [0, 10], [1, 0], { extrapolateRight: 'clamp' });
    return <AbsoluteFill style={{ backgroundColor: '#fff', opacity }} />;
};

// Escena 0: Anuncio de rotar teléfono (3 segundos)
const Announcement = () => {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0]);
    
    return (
        <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ 
                    width: '50px', 
                    height: '90px', 
                    border: '3px solid #fff', 
                    borderRadius: '10px', 
                    position: 'relative',
                    marginBottom: '15px'
                }}>
                    <div style={{ width: '15px', height: '3px', background: '#fff', position: 'absolute', top: '4px', left: '17px', borderRadius: '2px' }} />
                </div>
                <div style={{ width: '180px', height: '3px', background: '#fff', marginBottom: '30px' }} />
                <div style={{ 
                    transform: 'rotate(-90deg)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '5px'
                }}>
                    <span style={{ fontSize: '16px', letterSpacing: '2px' }}>TU TELÉFONO</span>
                    <span style={{ fontSize: '40px', fontWeight: 'bold', letterSpacing: '2px' }}>GIRA</span>
                    <span style={{ fontSize: '16px', letterSpacing: '2px' }}>POR FAVOR</span>
                </div>
            </div>
        </AbsoluteFill>
    );
};

// Escena 1: Intro Rápido (Teaser)
const IntroTeaser = () => {
    const frame = useCurrentFrame();
    const imageIndex = Math.floor(frame / 3) % images.length;
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            <img src={images[imageIndex]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="teaser" />
            <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
        </AbsoluteFill>
    );
};

// Escena 3: Zoom In con Paneo Horizontal, Slide y TEXTO
const DramaticZoom = ({ imgSrc, title, subtitle }) => {
    const frame = useCurrentFrame();
    
    const scale = interpolate(frame, [0, 45, 75, 120, 135, 150], [1, 1, 1.4, 1.4, 1, 1], { extrapolateRight: 'clamp' });
    const translateX = interpolate(
        frame, 
        [0, 15, 45, 75, 120, 135, 150], 
        [1000, 0, 0, 250, -250, 0, -1000], 
        { extrapolateRight: 'clamp' }
    );
    
    const opacity = interpolate(frame, [0, 15, 135, 150], [0, 1, 1, 0]);
    
    const textOpacity = interpolate(frame, [20, 35, 120, 135], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
    const textTranslateY = interpolate(frame, [20, 35], [20, 0], { extrapolateRight: 'clamp' });
    
    return (
        <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
            <div style={{ 
                width: '100%', 
                height: '100%', 
                transform: `scale(${scale}) translateX(${translateX}px)`,
                opacity,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="zoom" />
            </div>

            {title && (
                <div style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '60px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(10px)',
                    padding: '20px 40px',
                    borderRadius: '15px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontFamily: 'system-ui, sans-serif',
                    opacity: textOpacity,
                    transform: `translateY(${textTranslateY}px)`,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '5px', fontWeight: 'bold' }}>
                        {subtitle || "Plataforma Solcan"}
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                        {title}
                    </div>
                </div>
            )}
        </AbsoluteFill>
    );
};

// Escena 4: Mosaico
const Mosaic = () => {
    const frame = useCurrentFrame();
    const scale = interpolate(frame, [0, 90], [1.1, 1], { extrapolateRight: 'clamp' });
    
    return (
        <AbsoluteFill style={{ backgroundColor: '#000', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', padding: '10px', transform: `scale(${scale})` }}>
            <img src={img_dashboard} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="m1" />
            <img src={img_catalogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="m2" />
            <img src={img_rh} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="m3" />
            <img src={img_chat_conv} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="m4" />
        </AbsoluteFill>
    );
};

// Escena Final: Login con Zoom Suave
const FinalScene = ({ imgSrc }) => {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 15, 135, 150], [0, 1, 1, 0]);
    const scale = interpolate(frame, [0, 150], [1, 1.15], { extrapolateRight: 'clamp' });
    
    return (
        <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity, transform: `scale(${scale})` }} alt="final login" />
        </AbsoluteFill>
    );
};

export const PromotionalVideo = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {/* Audio de fondo */}
            <Audio src={music} />

            {/* 0s - 3s: Anuncio de rotar pantalla */}
            <Sequence from={0} durationInFrames={90}>
                <Announcement />
            </Sequence>

            {/* 3s - 8s: Intro Teaser (Ráfaga) */}
            <Sequence from={90} durationInFrames={150}>
                <IntroTeaser />
            </Sequence>
            
            {/* 8s - 13s: Login */}
            <Sequence from={240} durationInFrames={150}>
                <DramaticZoom imgSrc={img_login} title="Acceso Seguro" subtitle="PLATAFORMA SOLCAN" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 13s - 18s: Bienvenida */}
            <Sequence from={390} durationInFrames={150}>
                <DramaticZoom imgSrc={img_bienvenida} title="Panel de Bienvenida" subtitle="MÓDULO DE INICIO" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 18s - 23s: Dashboard */}
            <Sequence from={540} durationInFrames={150}>
                <DramaticZoom imgSrc={img_dashboard} title="Panel de Control" subtitle="VISTA GENERAL" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>

            {/* 23s - 28s: Catálogo */}
            <Sequence from={690} durationInFrames={150}>
                <DramaticZoom imgSrc={img_catalogo} title="Catálogo Central" subtitle="MANEJO DE INVENTARIOS" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 28s - 33s: Inventario */}
            <Sequence from={840} durationInFrames={150}>
                <DramaticZoom imgSrc={img_inventario} title="Inventario General" subtitle="CONTROL DE STOCK" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 33s - 38s: Vales */}
            <Sequence from={990} durationInFrames={150}>
                <DramaticZoom imgSrc={img_vale} title="Vales de Surtido" subtitle="LOGÍSTICA INTERNA" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>

            {/* 38s - 43s: Bitácora de Maquilas (NUEVA ESCENA) */}
            <Sequence from={1140} durationInFrames={150}>
                <DramaticZoom imgSrc={img_maquilas} title="Bitácora de Maquilas" subtitle="CONTROL EXTERNO" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 43s - 48s: Chat */}
            <Sequence from={1290} durationInFrames={150}>
                <DramaticZoom imgSrc={img_chat_conv} title="Chat en Vivo" subtitle="COMUNICACIÓN ENTRE ÁREAS" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 48s - 53s: Recursos Humanos 1 */}
            <Sequence from={1440} durationInFrames={150}>
                <DramaticZoom imgSrc={img_rh} title="Recursos Humanos" subtitle="GESTIÓN DE PERSONAL" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>

            {/* 53s - 58s: Recursos Humanos 2 */}
            <Sequence from={1590} durationInFrames={150}>
                <DramaticZoom imgSrc={img_rh2} title="Expediente Digital" subtitle="RECURSOS HUMANOS" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>

            {/* 58s - 63s: Control de Calidad (NUEVA ESCENA) */}
            <Sequence from={1740} durationInFrames={150}>
                <DramaticZoom imgSrc={img_calidad} title="Control de Calidad" subtitle="ACCIONES Y SEGUIMIENTO" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 63s - 66s: Mosaico */}
            <Sequence from={1890} durationInFrames={90}>
                <Mosaic />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
            
            {/* 66s - 73s: Cierre con Dashboard */}
            <Sequence from={1980} durationInFrames={210}>
                <DramaticZoom imgSrc={img_dashboard} title="Solución Integral" subtitle="SOLCAN LOGÍSTICA" />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>

            {/* 73s - 78s: Login Final */}
            <Sequence from={2190} durationInFrames={150}>
                <FinalScene imgSrc={img_login_cierre} />
                <Sequence from={0} durationInFrames={10}><Flash frame={useCurrentFrame()} /></Sequence>
            </Sequence>
        </AbsoluteFill>
    );
};
