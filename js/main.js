(function () {
  const SOUNDS = {
    open: "./sounds/open_chest.mp3",
    close: "./sounds/close_chest.mp3",
  };

  let playlist = [
    {
      name: "🎂 Поздравление с 17-летием! 🎂",
      src: "./sounds/birthday.mp3",
      colorTheme: "pinkCoral",
      coverSrc: "./img/cover1.jpg",
    },
    {
      name: "💖 Улыбайся)) 💖",
      src: "./sounds/favorite.mp3",
      colorTheme: "vibrantPink",
      coverSrc: "./img/cover2.jpg",
    },
    {
      name: "🌸 Вайбик 🌸",
      src: "./sounds/surprise.mp3",
      colorTheme: "magenta",
      coverSrc: "./img/cover3.jpg",
    },
  ];

  // DOM
  const hero = document.getElementById("heroScreen");
  const boombox = document.getElementById("boombox");
  const openBtn = document.getElementById("openBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const volumeSlider = document.getElementById("volumeSlider");
  const trackNameSpan = document.getElementById("trackName");
  const canvasElem = document.getElementById("peonyCanvas");

  let preloadedAudios = [];
  let currentAudioIndex = 0;
  let musicAudio = null;

  let openSound = new Audio(SOUNDS.open);
  let closeSound = new Audio(SOUNDS.close);

  let isPlaying = false;
  let isBoomboxOpen = false;
  let isSwitchingTrack = false;
  let isAnimatingTransition = false;
  let isResizeHandlerActive = true;

  let masterVolume = 0.7;
  let progressInterval = null;

  function preloadAllTracks() {
    preloadedAudios = playlist.map((track, idx) => {
      const audio = new Audio();
      audio.src = track.src;
      audio.preload = "auto";
      audio.volume = masterVolume;
      audio.loop = false; // теперь не зациклен
      audio.load();
      // Обработчик окончания трека
      audio.addEventListener("ended", () => {
        if (!isSwitchingTrack && isBoomboxOpen) {
          nextTrack();
        }
      });
      return audio;
    });
    musicAudio = preloadedAudios[0];
    currentAudioIndex = 0;
  }

  function setVolumeForAll(vol) {
    masterVolume = vol;
    if (musicAudio) musicAudio.volume = vol;
    preloadedAudios.forEach((a) => {
      a.volume = vol;
    });
    volumeSlider.value = vol;
  }

  function startProgressTracking() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (
        !isBoomboxOpen ||
        isSwitchingTrack ||
        !musicAudio ||
        musicAudio.paused ||
        !musicAudio.duration
      )
        return;
      const progress = musicAudio.currentTime / musicAudio.duration;
      if (window.PeonyCanvas) {
        window.PeonyCanvas.setProgress(progress);
      }
    }, 100);
  }

  function stopProgressTracking() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  async function fadeOut(audio, duration = 0.5) {
    if (!audio) return Promise.resolve();
    const startVol = audio.volume;
    const stepTime = 50;
    const steps = (duration * 1000) / stepTime;
    const step = startVol / steps;
    let currentStep = 0;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (currentStep >= steps || audio.volume <= 0.01) {
          audio.volume = 0;
          clearInterval(interval);
          resolve();
        } else {
          audio.volume = Math.max(0, audio.volume - step);
          currentStep++;
        }
      }, stepTime);
    });
  }

  async function fadeIn(audio, duration = 0.5, targetVol = masterVolume) {
    if (!audio) return Promise.resolve();
    audio.volume = 0;
    const stepTime = 50;
    const steps = (duration * 1000) / stepTime;
    const step = targetVol / steps;
    let currentStep = 0;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (currentStep >= steps) {
          audio.volume = targetVol;
          clearInterval(interval);
          resolve();
        } else {
          audio.volume = Math.min(targetVol, audio.volume + step);
          currentStep++;
        }
      }, stepTime);
    });
  }

  function liftArm(lift) {
    if (window.PeonyCanvas) {
      window.PeonyCanvas.setArmLifted(lift);
    }
  }

  async function switchToTrack(index, direction) {
    if (index === currentAudioIndex && musicAudio) return;
    if (isSwitchingTrack) return;
    isSwitchingTrack = true;

    const wasPlaying = isPlaying;

    // Поднимаем тонарм
    liftArm(true);
    await new Promise((r) => setTimeout(r, 200));

    // Fade out текущего
    if (musicAudio && !musicAudio.paused) {
      await fadeOut(musicAudio, 0.3);
      musicAudio.pause();
    }

    // Меняем аудио
    musicAudio = preloadedAudios[index];
    currentAudioIndex = index;
    musicAudio.volume = 0;
    const song = playlist[index];
    trackNameSpan.innerText = song.name;

    // Обновляем обложку
    if (window.PeonyCanvas && song.coverSrc) {
      window.PeonyCanvas.setCoverImage(song.coverSrc);
    }

    // Анимация диска (fly out/in)
    let flyOutClass, flyInClass;
    if (direction === "next") {
      flyOutClass = "canvas-fly-out-left";
      flyInClass = "canvas-fly-in-right";
    } else {
      flyOutClass = "canvas-fly-out-right";
      flyInClass = "canvas-fly-in-left";
    }

    canvasElem.classList.add(flyOutClass);
    await new Promise((r) => setTimeout(r, 700));
    canvasElem.classList.remove(flyOutClass);

    // Сброс позиции тонарма (прогресс 0)
    if (window.PeonyCanvas) {
      window.PeonyCanvas.setProgress(0);
      window.PeonyCanvas.resizeAndRedraw();
    }

    canvasElem.classList.add(flyInClass);
    await new Promise((r) => setTimeout(r, 700));
    canvasElem.classList.remove(flyInClass);

    // Опускаем тонарм
    liftArm(false);

    if (wasPlaying && isBoomboxOpen) {
      await musicAudio.play().catch((e) => console.log);
      await fadeIn(musicAudio, 0.4);
      isPlaying = true;
      playPauseBtn.innerHTML = "⏸️";
      if (window.PeonyCanvas) {
        window.PeonyCanvas.setPlaying(true);
        window.PeonyCanvas.startSpin();
      }
      startProgressTracking();
    } else {
      playPauseBtn.innerHTML = "▶️";
      if (window.PeonyCanvas) {
        window.PeonyCanvas.setPlaying(false);
        window.PeonyCanvas.stopSpin();
      }
    }

    isSwitchingTrack = false;
  }

  function nextTrack() {
    if (!isBoomboxOpen || isSwitchingTrack) return;
    const newIndex = (currentAudioIndex + 1) % playlist.length;
    switchToTrack(newIndex, "next");
  }

  function prevTrack() {
    if (!isBoomboxOpen || isSwitchingTrack) return;
    const newIndex =
      (currentAudioIndex - 1 + playlist.length) % playlist.length;
    switchToTrack(newIndex, "prev");
  }

  async function playMusic() {
    if (!isBoomboxOpen || !musicAudio) return;
    await musicAudio.play().catch((e) => console.log);
    isPlaying = true;
    playPauseBtn.innerHTML = "⏸️";
    if (window.PeonyCanvas) {
      window.PeonyCanvas.setPlaying(true);
      window.PeonyCanvas.startSpin();
    }
    startProgressTracking();
  }

  function pauseMusic() {
    if (!musicAudio) return;
    musicAudio.pause();
    isPlaying = false;
    playPauseBtn.innerHTML = "▶️";
    if (window.PeonyCanvas) {
      window.PeonyCanvas.setPlaying(false);
      window.PeonyCanvas.stopSpin();
    }
    stopProgressTracking();
  }

  function togglePlayPause() {
    if (!isBoomboxOpen || isSwitchingTrack) return;
    if (isPlaying) pauseMusic();
    else playMusic();
  }

  function playSound(sound) {
    if (!sound.paused) sound.pause();
    sound.currentTime = 0;
    sound.play().catch((e) => console.log);
  }

  async function openBoombox() {
    if (isBoomboxOpen || isAnimatingTransition) return;
    isAnimatingTransition = true;
    playSound(openSound);
    hero.classList.add("hide");
    document.body.classList.add("open-mode");
    setTimeout(async () => {
      isBoomboxOpen = true;
      boombox.classList.add("open");
      const firstCover = playlist[0].coverSrc || null;
      if (window.PeonyCanvas && canvasElem) {
        window.PeonyCanvas.start(canvasElem, firstCover);
        window.PeonyCanvas.setPlaying(false);
        window.PeonyCanvas.setArmLifted(false);
        window.PeonyCanvas.setProgress(0);
        window.PeonyCanvas.stopSpin();
        setTimeout(() => window.PeonyCanvas.resizeAndRedraw(), 30);
      }
      musicAudio = preloadedAudios[0];
      musicAudio.volume = 0;
      trackNameSpan.innerText = playlist[0].name;
      await musicAudio.play().catch((e) => console.log);
      await fadeIn(musicAudio, 0.5);
      isPlaying = true;
      playPauseBtn.innerHTML = "⏸️";
      if (window.PeonyCanvas) {
        window.PeonyCanvas.setPlaying(true);
        window.PeonyCanvas.startSpin();
      }
      startProgressTracking();
      isAnimatingTransition = false;
    }, 900);
  }

  async function closeBoombox() {
    if (!isBoomboxOpen || isAnimatingTransition) return;
    isAnimatingTransition = true;
    playSound(closeSound);
    if (musicAudio && isPlaying) {
      await fadeOut(musicAudio, 0.3);
      musicAudio.pause();
      isPlaying = false;
      if (window.PeonyCanvas) window.PeonyCanvas.setPlaying(false);
    }
    stopProgressTracking();
    boombox.classList.add("closing");
    setTimeout(() => {
      if (window.PeonyCanvas) window.PeonyCanvas.stop();
      boombox.classList.remove("open", "closing");
      isBoomboxOpen = false;
      document.body.classList.remove("open-mode");
      hero.classList.remove("hide");
      isAnimatingTransition = false;
    }, 400);
  }

  // Свайпы (без изменений, работают)
  let touchStartX = 0,
    touchStartY = 0;
  let touchMoved = false;
  function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoved = false;
  }
  function handleTouchMove(e) {
    if (!isBoomboxOpen || isSwitchingTrack) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) touchMoved = true;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20)
      e.preventDefault();
    else if (Math.abs(deltaY) > 20 && deltaY > 0) e.preventDefault();
  }
  function handleTouchEnd(e) {
    if (!isBoomboxOpen || !touchMoved || isSwitchingTrack) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        if (navigator.vibrate) navigator.vibrate(20);
        nextTrack();
      } else {
        if (navigator.vibrate) navigator.vibrate(20);
        prevTrack();
      }
      e.preventDefault();
    } else if (Math.abs(deltaY) > 45 && deltaY > 0) {
      if (navigator.vibrate) navigator.vibrate(20);
      closeBoombox();
      e.preventDefault();
    }
    touchMoved = false;
  }

  function handleResize() {
    if (!isResizeHandlerActive) return;
    if (isBoomboxOpen && window.PeonyCanvas)
      window.PeonyCanvas.resizeAndRedraw();
  }

  function bindEvents() {
    openBtn.addEventListener("click", openBoombox);
    prevBtn.addEventListener("click", () => {
      if (isBoomboxOpen && !isSwitchingTrack) prevTrack();
    });
    nextBtn.addEventListener("click", () => {
      if (isBoomboxOpen && !isSwitchingTrack) nextTrack();
    });
    playPauseBtn.addEventListener("click", togglePlayPause);
    volumeSlider.addEventListener("input", (e) =>
      setVolumeForAll(parseFloat(e.target.value)),
    );
    const touchZone = document.getElementById("vinylTouchZone");
    touchZone.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    touchZone.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    touchZone.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("resize", handleResize);
  }

  preloadAllTracks();
  setVolumeForAll(0.7);
  bindEvents();
  console.log(
    "✅ Виниловый проигрыватель с тонармом, автоматическим переключением треков, подъёмом/опусканием головки и обложками",
  );
})();
