import React from 'react';

const Background = () => {
  return (
    <div>
      <div className="fixed inset-0 pointer-events-none">
      {/* Radial gradients for depth - increased visibility */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-[#3B82F6]/15 via-[#3B82F6]/8 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-radial from-[#8B5CF6]/12 via-[#8B5CF6]/6 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[#3B82F6]/10 via-[#3B82F6]/3 to-transparent rounded-full blur-3xl"></div>
      
      {/* Additional background orbs for more depth */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-radial from-[#8B5CF6]/8 via-[#8B5CF6]/3 to-transparent rounded-full blur-2xl"></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-gradient-radial from-[#3B82F6]/6 via-[#3B82F6]/2 to-transparent rounded-full blur-2xl"></div>
      
      {/* Enhanced geometric grid overlay */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      {/* More visible floating dots */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-[#3B82F6]/40 rounded-full shadow-lg shadow-[#3B82F6]/20"></div>
      <div className="absolute top-40 right-32 w-2 h-2 bg-[#8B5CF6]/40 rounded-full shadow-lg shadow-[#8B5CF6]/20"></div>
      <div className="absolute bottom-32 left-40 w-2 h-2 bg-[#3B82F6]/35 rounded-full shadow-lg shadow-[#3B82F6]/15"></div>
      <div className="absolute bottom-20 right-20 w-2 h-2 bg-[#8B5CF6]/35 rounded-full shadow-lg shadow-[#8B5CF6]/15"></div>
      <div className="absolute top-60 left-1/2 w-1.5 h-1.5 bg-[#3B82F6]/30 rounded-full shadow-md shadow-[#3B82F6]/10"></div>
      <div className="absolute bottom-40 right-1/3 w-1.5 h-1.5 bg-[#8B5CF6]/30 rounded-full shadow-md shadow-[#8B5CF6]/10"></div>
      <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-[#3B82F6]/25 rounded-full"></div>
      <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-[#8B5CF6]/25 rounded-full"></div>

      {/* Enhanced diagonal lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3B82F6]/25 to-transparent transform rotate-12 origin-left"></div>
      <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/20 to-transparent transform -rotate-12 origin-right"></div>
      
      {/* Additional subtle accent lines */}
      <div className="absolute top-1/4 right-0 w-full h-px bg-gradient-to-l from-transparent via-[#8B5CF6]/15 to-transparent transform -rotate-6 origin-right"></div>
      <div className="absolute bottom-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3B82F6]/15 to-transparent transform rotate-6 origin-left"></div>

      {/* Subtle corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-radial from-[#3B82F6]/12 to-transparent"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-[#8B5CF6]/12 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-radial from-[#8B5CF6]/10 to-transparent"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-radial from-[#3B82F6]/10 to-transparent"></div>
    </div>
    </div>
  )
}

export default Background
