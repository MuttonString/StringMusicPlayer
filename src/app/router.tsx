import { createBrowserRouter, Navigate } from 'react-router';
import Layout from '../entries/main/layout';
import AlbumCollection from '../pages/AlbumCollection';
import ArtistCollection from '../pages/ArtistCollection';
import Error from '../pages/Error';
import RouterErrorBoundary from '../pages/ErrorBoundary/router';
import FavoriteSongs from '../pages/FavoriteSongs';
import Home from '../pages/Home';
import MVCollection from '../pages/MVCollection';
import Playlist from '../pages/Playlist';
import Recent from '../pages/Recent';
import Recommendation from '../pages/Recommendaion';

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        path: '/',
        element: <Navigate to='home' replace />,
      },
      {
        index: true,
        path: 'home',
        element: <Home />,
      },
      {
        path: 'recommendation',
        element: <Recommendation />,
      },
      {
        path: 'recent',
        element: <Recent />,
      },
      {
        path: 'artistCollection',
        element: <ArtistCollection />,
      },
      {
        path: 'albumCollection',
        element: <AlbumCollection />,
      },
      {
        path: 'mvCollection',
        element: <MVCollection />,
      },
      {
        path: 'playlist',
        element: <Playlist />,
      },
      {
        path: 'favoriteSongs',
        element: <FavoriteSongs />,
      },
      {
        path: '*',
        element: <Error />,
      },
    ],
  },
]);

export default router;
