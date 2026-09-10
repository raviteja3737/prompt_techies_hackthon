import React from 'react'
import StackedTextDark from './StackedTextdark'
import 'remixicon/fonts/remixicon.css'

const Preptember = () => {
  return (
    <div className="preptember-cta flex flex-col items-center justify-between bg-surface-container-low p-8">
      <h1 className='text-4xl w-full text-center flex items-center justify-center mb-12'>
        <StackedTextDark text="Innovation Programs" fontSize='55px' />
      </h1>
      
      <div className='w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 px-2 lg:px-12 mb-12'>
        
        {/* Card 1 */}
        <div className="bg-surface rounded-xl p-6 shadow-elevation-md border border-outline-variant hover:shadow-elevation-lg hover:border-primary/30 transition-all duration-300 ease-out group flex flex-col items-start text-left">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl mb-4">
            <i className="ri-robot-line"></i>
          </div>
          <span className="bg-tertiary-container text-on-tertiary-container text-label-sm rounded-full px-3 py-1 mb-3">Flagship</span>
          <h3 className="text-title-lg text-on-surface group-hover:text-primary transition-colors mb-2">AI & Emerging Tech Bootcamps</h3>
          <p className="text-body-md text-on-surface-variant">Hands-on Generative AI, LLMs, prompt engineering, and autonomous agent building.</p>
        </div>

        {/* Card 2 */}
        <div className="bg-surface rounded-xl p-6 shadow-elevation-md border border-outline-variant hover:shadow-elevation-lg hover:border-primary/30 transition-all duration-300 ease-out group flex flex-col items-start text-left">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl mb-4">
            <i className="ri-code-s-slash-line"></i>
          </div>
          <span className="bg-tertiary-container text-on-tertiary-container text-label-sm rounded-full px-3 py-1 mb-3">Industry Standard</span>
          <h3 className="text-title-lg text-on-surface group-hover:text-primary transition-colors mb-2">Full-Stack AI Engineering</h3>
          <p className="text-body-md text-on-surface-variant">Develop and deploy scalable AI web applications with Next.js, Vercel AI SDK, and modern cloud APIs.</p>
        </div>

        {/* Card 3 */}
        <div className="bg-surface rounded-xl p-6 shadow-elevation-md border border-outline-variant hover:shadow-elevation-lg hover:border-primary/30 transition-all duration-300 ease-out group flex flex-col items-start text-left">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl mb-4">
            <i className="ri-trophy-line"></i>
          </div>
          <span className="bg-tertiary-container text-on-tertiary-container text-label-sm rounded-full px-3 py-1 mb-3">High Impact</span>
          <h3 className="text-title-lg text-on-surface group-hover:text-primary transition-colors mb-2">Technical Hackathons & Sprints</h3>
          <p className="text-body-md text-on-surface-variant">Fast-paced innovation challenges solving real-world problems under mentorship.</p>
        </div>

        {/* Card 4 */}
        <div className="bg-surface rounded-xl p-6 shadow-elevation-md border border-outline-variant hover:shadow-elevation-lg hover:border-primary/30 transition-all duration-300 ease-out group flex flex-col items-start text-left">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl mb-4">
            <i className="ri-briefcase-line"></i>
          </div>
          <span className="bg-tertiary-container text-on-tertiary-container text-label-sm rounded-full px-3 py-1 mb-3">Placement</span>
          <h3 className="text-title-lg text-on-surface group-hover:text-primary transition-colors mb-2">Career Readiness & Portfolio Sprints</h3>
          <p className="text-body-md text-on-surface-variant">Production-grade code, GitHub audits, interview prep, and direct startup internships.</p>
        </div>

      </div>

      <a 
        href="https://prompttechies.in/programs" 
        target="_blank" 
        rel="noopener noreferrer"
        className="bg-primary text-on-primary rounded-full px-8 py-3 text-label-md shadow-primary-glow hover:shadow-primary-glow-hover hover:bg-primary-container transition-all duration-200 ease-out"
      >
        Explore Programs →
      </a>
    </div>
  )
}

export default Preptember
