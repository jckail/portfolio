import React, { useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import getParticlesConfig from '../particlesConfig'
import { particleConfig } from '../configs'
import { updateParticlesConfig } from '../utils/helpers'

/**
 * ParticlesBackground component that renders a particle animation background.
 * The particle configuration changes based on the current theme.
 */
function ParticlesBackground({ theme }) {
  const updateParticlesConfigCallback = useCallback(() => {
    return updateParticlesConfig(theme, particleConfig, getParticlesConfig)
  }, [theme])

  useEffect(() => {
    if (window.particlesJS) {
      window.particlesJS('particles-js', updateParticlesConfigCallback())
    }

    return () => {
      if (window.pJSDom && window.pJSDom[0]) {
        window.pJSDom[0].pJS.fn.vendors.destroypJS()
        window.pJSDom = []
      }
    }
  }, [updateParticlesConfigCallback])

  return <div id="particles-js"></div>
}

ParticlesBackground.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
}

export default ParticlesBackground
