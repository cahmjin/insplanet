/* Frame 27 background: animated gradient through fluted glass (shaders package).
   Mounted as a small React island into .insight-card > #insight-shader.
   (Params kept out of index.html source.) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { Shader, Swirl, FlowingGradient, FlutedGlass, FilmGrain } from 'shaders/react';

const html = htm.bind(React.createElement);
const el = document.getElementById('insight-shader');

if (el) {
  createRoot(el).render(html`
    <${Shader} style=${{ width: '100%', height: '100%' }}>
      <${FlowingGradient} colorA="#1b0731" colorB="#ae87e8" colorC="#1b0731" colorD="#b54f63"
        speed=${2.6} distortion=${0.4} seed=${81} />
      <${Swirl} colorA="#ffffff" colorB="#f0f0f0" detail=${3.4} blendMode="multiply" opacity=${1} />
      <${FlutedGlass} aberration=${1.0} angle=${31} frequency=${12} highlight=${0.1}
        highlightSoftness=${0} lightAngle=${-90} refraction=${4.3} shape="rounded"
        softness=${1} speed=${0.2} waveAmplitude=${0} waveFrequency=${0} />
      <${FilmGrain} strength=${0} />
    <//>
  `);
}
