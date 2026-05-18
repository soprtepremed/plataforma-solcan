import { registerRoot } from 'remotion';
import { Composition } from 'remotion';
import { PromotionalVideo } from './PromotionalVideo';
import { CinematicVideo } from './CinematicVideo'; // NUEVO VIDEO
import React from 'react';

export const Root = () => {
    return (
        <>
            {/* Video Comercial Original */}
            <Composition
                id="PromotionalVideo"
                component={PromotionalVideo}
                durationInFrames={2340}
                fps={30}
                width={1920}
                height={1080}
            />

            {/* Video Cinematográfico (Historia) */}
            <Composition
                id="CinematicVideo"
                component={CinematicVideo}
                durationInFrames={960} // 32 segundos * 30 fps = 960 frames
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};

registerRoot(Root);
