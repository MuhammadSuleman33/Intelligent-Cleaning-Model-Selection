import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Full-viewport Three.js background (wireframe + particles). Decorative only.
 */
export function ThreeBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / Math.max(window.innerHeight, 1),
      0.1,
      100,
    )
    camera.position.z = 4.2

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const geo = new THREE.IcosahedronGeometry(1.15, 1)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    const pCount = 900
    const positions = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount * 3; i += 1) {
      positions[i] = (Math.random() - 0.5) * 18
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const pMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.028,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
    const points = new THREE.Points(pGeo, pMat)
    scene.add(points)

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      mesh.rotation.x += 0.0012
      mesh.rotation.y += 0.002
      points.rotation.y += 0.0004
      renderer.render(scene, camera)
    }
    tick()

    const onResize = () => {
      const w = window.innerWidth
      const h = Math.max(window.innerHeight, 1)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      geo.dispose()
      mat.dispose()
      pGeo.dispose()
      pMat.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
    />
  )
}
