import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { PokedexProvider } from './context/PokedexContext'
import ListView from './pages/ListView'
import GalleryView from './pages/GalleryView'
import DetailView from './pages/DetailView'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <PokedexProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/list" replace />} />
          <Route path="list" element={<ListView />} />
          <Route path="gallery" element={<GalleryView />} />
          <Route path="pokemon/:id" element={<DetailView />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </PokedexProvider>
  )
}
