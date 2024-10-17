import React from 'react'

function SandwichMenu({ onClick }) {
  return (
    <button className="sandwich-menu" onClick={onClick}>
      <div></div>
      <div></div>
      <div></div>
    </button>
  )
}

export default SandwichMenu
