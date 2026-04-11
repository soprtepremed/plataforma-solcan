import React from 'react';

// Code 128-B mapping for a subset of characters (Standard for alphanumeric IDs)
// Simplified version for the specific HE-RH-26 type IDs
const Code128B = {
    ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
    '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
    '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
    ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
    '0': '10011101100', '1': '10011100110', '2': '11001110110', '3': '11001110011',
    '4': '11011101100', '5': '11011100110', '6': '11011001110', '7': '11011011100',
    '8': '11011001110', '9': '11001110110', ':': '11110110110', ';': '11110110011',
    '<': '11000110110', '=': '11000110011', '>': '11011011110', '?': '11011001111',
    '@': '11101101110', 'A': '11101100110', 'B': '11100110110', 'C': '11100110011',
    'D': '11101110110', 'E': '11101110011', 'F': '11011101110', 'G': '11011100111',
    'H': '11101110110', 'I': '11011101110', 'J': '11011110110', 'K': '11101111010',
    'L': '11101111010', 'M': '11101111010', 'N': '11101111010', 'O': '11110110110',
    'P': '11110110011', 'Q': '11110111011', 'R': '11111011011', 'S': '11111011011',
    'T': '11011011110', 'U': '11011001111', 'V': '11101101110', 'W': '11101100111',
    'X': '11100110111', 'Y': '11100110111', 'Z': '11100110111', '[': '11110110110',
    '\\': '11110110011', ']': '11110111011', '^': '11111011011', '_': '11111011011'
};

const START_B = '11010010000';
const STOP = '1100011101011';

export default function Barcode({ value, width = 1.2, height = 35 }) {
    if (!value) return null;

    // Generador real de barras basado en el diccionario Code128B superior
    const generateBars = () => {
        let bars = START_B;
        for (let char of value) {
            bars += Code128B[char] || '';
        }
        bars += STOP;
        return bars;
    };

    const barPattern = generateBars();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <svg 
                width="100%" 
                height={height} 
                viewBox={`0 0 ${barPattern.length} 100`} 
                preserveAspectRatio="none"
                style={{ display: 'block' }}
            >
                {barPattern.split('').map((bit, i) => (
                    bit === '1' && (
                        <rect 
                            key={i} 
                            x={i} 
                            y="0" 
                            width="1" 
                            height="100" 
                            fill="#000" 
                        />
                    )
                ))}
            </svg>
            <code style={{ 
                fontSize: '9px', 
                marginTop: '2px', 
                color: '#000', 
                fontWeight: 'bold',
                fontFamily: 'monospace' 
            }}>
                {value}
            </code>
        </div>
    );
}
