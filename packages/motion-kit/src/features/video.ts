import type { Feature } from './types';
import { whenVisible } from '../observe';

// <div data-sf-video data-src="hero.mp4" data-src-mobile="hero-720.mp4" data-poster="hero.avif">
// The still image shows first. The video only downloads on capable devices,
// plays silently on loop while visible, and has a pause button.
export const videoHero: Feature = {
  selector: '[data-sf-video]',
  setup(host, env) {
    host.classList.add('sf-video');
    const poster = host.getAttribute('data-poster') ?? '';
    const src = (env.small && host.getAttribute('data-src-mobile')) || host.getAttribute('data-src');
    if (poster && !host.querySelector('img')) {
      const img = document.createElement('img');
      img.src = poster;
      img.alt = '';
      img.className = 'sf-video-media';
      img.setAttribute('fetchpriority', 'high');
      host.prepend(img);
    }
    if (!src || !/^[\w./:-]+\.(mp4|webm)(\?.*)?$/i.test(src) || env.tier === 'static' || env.lowPower) return;
    const video = document.createElement('video');
    video.className = 'sf-video-media';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    if (poster) video.poster = poster;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sf-video-toggle';
    let userPaused = false;
    const label = () => {
      btn.setAttribute('aria-label', video.paused ? 'Play background video' : 'Pause background video');
      btn.dataset.state = video.paused ? 'paused' : 'playing';
    };
    btn.addEventListener('click', () => {
      userPaused = !video.paused;
      if (video.paused) video.play().catch(() => {}); else video.pause();
    });
    video.addEventListener('play', label);
    video.addEventListener('pause', label);
    let loaded = false;
    const stop = whenVisible(
      host,
      () => {
        if (!loaded) { video.src = src; host.append(video, btn); loaded = true; }
        if (!userPaused && !document.documentElement.classList.contains('sf-paused')) video.play().catch(() => {});
      },
      () => video.pause(),
    );
    label();
    return () => { stop(); video.pause(); video.remove(); btn.remove(); };
  },
};
