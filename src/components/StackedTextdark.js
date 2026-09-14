"use client"
import React, { useState } from 'react';

const StackedTextDark = ({ text, fontSize = '48px'}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Responsive cap: keeps desktop px size intact via min(), shrinks on
  // narrow phones to avoid nowrap overflow (see StackedText).
  const responsiveFontSize = `min(${fontSize}, 11vw)`;

  const baseStyle = {
    fontWeight: 'bold',
    fontSize: responsiveFontSize,
    lineHeight: '1.1',
    position: 'absolute',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    transition: 'all 0.3s ease',
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* First layer */}
      <span
        style={{
          ...baseStyle,
          left: isHovered ? '0' : '12px',
          top: isHovered ? '0' : '12px',
          color: '#003cb3',
          textShadow: `
            -1px -1px 0 #003cb3, 
            1px -1px 0 #003cb3, 
            -1px 1px 0 #003cb3, 
            1px 1px 0 #003cb3`,
        }}
      >
        {text}
      </span>

      {/* Second layer */}
      <span
        style={{
          ...baseStyle,
          left: isHovered ? '0' : '6px',
          top: isHovered ? '0' : '6px',
          color: '#00c8ff',
          textShadow: `
            -1px -1px 0 #00c8ff, 
            1px -1px 0 #00c8ff, 
            -1px 1px 0 #00c8ff, 
            1px 1px 0 #00c8ff`,
          
        }}
      >
        {text}
      </span>

      {/* Third (top) layer */}
      <span
        style={{
          ...baseStyle,
          color: '#004bff',
          textShadow: `
            -1px -1px 0 #004bff, 
            1px -1px 0 #004bff, 
            -1px 1px 0 #004bff, 
            1px 1px 0 #004bff`,
          position: 'relative',
        }}
      >
        {text}
      </span>
    </div>
  );
};

export default StackedTextDark;
