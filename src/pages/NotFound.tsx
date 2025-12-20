/**
 * 404 Not Found Page
 */

import { useNavigate } from 'react-router-dom';
import { AnimatedSnake } from '../components/AnimatedSnake';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-neon-green mb-4">404</div>
        <div className="mb-4 flex justify-center">
          <AnimatedSnake size={80} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-gray-400 mb-8">
          The snake slithered away and we couldn't find that page. Maybe it's hiding in the 3D grid
          somewhere?
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-neon-green text-dark-900 font-semibold rounded-lg hover:bg-neon-green/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
