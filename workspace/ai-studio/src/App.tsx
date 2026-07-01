import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Playground from '@/pages/Playground'
import Midjourney from '@/pages/Midjourney'
import Suno from '@/pages/Suno'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/midjourney" element={<Midjourney />} />
          <Route path="/suno" element={<Suno />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
