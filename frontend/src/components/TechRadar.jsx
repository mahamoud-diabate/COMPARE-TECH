import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { buildRadarData } from '../utils/radarAxes';

/**
 * Radar comparatif. Les axes sont dérivés des specs réellement présentes en
 * base (voir `utils/radarAxes.js`) — un axe absent des données n'est pas
 * affiché plutôt que d'être rempli par une valeur inventée.
 *
 * `productType` peut être passé explicitement ; sinon on le lit sur le produit.
 */
function TechRadar({ product1, product2, productType }) {
  const chartData = buildRadarData(product1, product2, productType);

  if (chartData.length === 0) {
    return (
      <div className="text-center text-muted p-5">
        Les spécifications de ce produit ne permettent pas de tracer un radar.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '350px', minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />

          <Radar
            name={product1.name}
            dataKey="A"
            stroke="#0d6efd"
            fill="#0d6efd"
            fillOpacity={0.4}
          />

          {product2 && (
            <Radar
              name={product2.name}
              dataKey="B"
              stroke="#dc3545"
              fill="#dc3545"
              fillOpacity={0.4}
            />
          )}

          {/* Les valeurs affichées sont normalisées : le rappeler évite de les
              lire comme des specs brutes. */}
          <Tooltip formatter={value => `${value} / 100`} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TechRadar;
