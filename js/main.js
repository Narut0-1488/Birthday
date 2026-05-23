(function () {
  // ---------------------- НАСТРОЙКИ ----------------------
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
      name: "💖 Улыбайся, тебе очень идёт) 💖",
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

  const allCovers = playlist
    .map((track) => track.coverSrc)
    .filter((src) => src);
  if (window.PeonyCanvas) window.PeonyCanvas.preloadCovers(allCovers);

  // ---------------------- DOM ----------------------
  const hero = document.getElementById("heroScreen");
  const boombox = document.getElementById("boombox");
  const zippacket = document.getElementById("zippacket");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const volumeSlider = document.getElementById("volumeSlider");
  const trackNameSpan = document.getElementById("trackName");
  const canvasElem = document.getElementById("peonyCanvas");

  // ---------------------- ПЕРЕМЕННЫЕ ----------------------
  let preloadedAudios = [];
  let currentAudioIndex = 0;
  let musicAudio = null;

  let openSound = new Audio(SOUNDS.open);
  let closeSound = new Audio(SOUNDS.close);

  let isPlaying = false;
  let isBoomboxOpen = false;
  let isSwitchingTrack = false;
  let isAnimatingTransition = false;

  let masterVolume = 0.7;
  let progressInterval = null;

  // ---------------------- АУДИО ФУНКЦИИ ----------------------
  function preloadAllTracks() {
    preloadedAudios = playlist.map((track) => {
      const audio = new Audio(track.src);
      audio.preload = "auto";
      audio.volume = masterVolume;
      audio.loop = false;
      audio.load();
      audio.addEventListener("ended", () => {
        if (!isSwitchingTrack && isBoomboxOpen) nextTrack();
      });
      return audio;
    });
    musicAudio = preloadedAudios[0];
    currentAudioIndex = 0;
  }

  function setVolumeForAll(vol) {
    masterVolume = vol;
    preloadedAudios.forEach((a) => (a.volume = vol));
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
      if (window.PeonyCanvas) {
        window.PeonyCanvas.setProgress(
          musicAudio.currentTime / musicAudio.duration,
        );
      }
    }, 100);
  }

  function stopProgressTracking() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
  }

  async function fadeOut(audio, duration = 0.5) {
    if (!audio) return;
    const startVol = audio.volume;
    const steps = (duration * 1000) / 50;
    const step = startVol / steps;
    let i = 0;
    return new Promise((resolve) => {
      const int = setInterval(() => {
        if (++i >= steps || audio.volume <= 0.01) {
          audio.volume = 0;
          clearInterval(int);
          resolve();
        } else audio.volume = Math.max(0, audio.volume - step);
      }, 50);
    });
  }

  async function fadeIn(audio, duration = 0.5, targetVol = masterVolume) {
    if (!audio) return;
    audio.volume = 0;
    const steps = (duration * 1000) / 50;
    const step = targetVol / steps;
    let i = 0;
    return new Promise((resolve) => {
      const int = setInterval(() => {
        if (++i >= steps) {
          audio.volume = targetVol;
          clearInterval(int);
          resolve();
        } else audio.volume = Math.min(targetVol, audio.volume + step);
      }, 50);
    });
  }

  function liftArm(lift) {
    if (window.PeonyCanvas) window.PeonyCanvas.setArmLifted(lift);
  }

  // ==================== ИСПРАВЛЕНИЕ ====================
  async function playMusic() {
    if (!isBoomboxOpen || !musicAudio) return;

    // НЕ сбрасываем currentTime при возобновлении!
    await musicAudio.play().catch(console.log);

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

  // ---------------------- ПЕРЕКЛЮЧЕНИЕ ТРЕКА (всегда с начала) ----------------------
  async function switchToTrack(index, direction) {
    if (index === currentAudioIndex && musicAudio) return;
    if (isSwitchingTrack) return;
    isSwitchingTrack = true;

    const wasPlaying = isPlaying;
    liftArm(true);
    await new Promise((r) => setTimeout(r, 180));

    if (musicAudio && !musicAudio.paused) {
      await fadeOut(musicAudio, 0.3);
      musicAudio.pause();
    }

    musicAudio = preloadedAudios[index];
    currentAudioIndex = index;
    const song = playlist[index];
    trackNameSpan.innerText = song.name;

    let flyOutClass =
      direction === "next" ? "canvas-fly-out-left" : "canvas-fly-out-right";
    let flyInClass =
      direction === "next" ? "canvas-fly-in-right" : "canvas-fly-in-left";

    canvasElem.classList.add(flyOutClass);
    await new Promise((r) => setTimeout(r, 650));
    canvasElem.classList.remove(flyOutClass);

    if (window.PeonyCanvas && song.coverSrc)
      await window.PeonyCanvas.setCoverImage(song.coverSrc);
    if (window.PeonyCanvas) {
      window.PeonyCanvas.setProgress(0);
      window.PeonyCanvas.resizeAndRedraw();
    }

    canvasElem.classList.add(flyInClass);
    await new Promise((r) => setTimeout(r, 650));
    canvasElem.classList.remove(flyInClass);

    liftArm(false);

    if (wasPlaying && isBoomboxOpen) {
      musicAudio.currentTime = 0; // ← только при смене трека
      await musicAudio.play().catch(console.log);
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
    switchToTrack((currentAudioIndex + 1) % playlist.length, "next");
  }

  function prevTrack() {
    if (!isBoomboxOpen || isSwitchingTrack) return;
    switchToTrack(
      (currentAudioIndex - 1 + playlist.length) % playlist.length,
      "prev",
    );
  }

  function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(console.log);
  }

  // ---------------------- ОТКРЫТИЕ ----------------------
  async function openBoomboxWithPacket() {
    if (isBoomboxOpen || isAnimatingTransition) return;
    isAnimatingTransition = true;
    playSound(openSound);

    document.body.classList.add("open-mode");

    zippacket.classList.add("opening");
    await new Promise((r) => setTimeout(r, 350));

    zippacket.classList.add("fly-down");
    boombox.classList.add("open");

    await new Promise((r) => setTimeout(r, 2700));

    zippacket.style.display = "none";
    hero.style.display = "none";

    const firstCover = playlist[0].coverSrc || null;
    if (window.PeonyCanvas && canvasElem) {
      window.PeonyCanvas.start(canvasElem, firstCover);
      window.PeonyCanvas.setProgress(0);
      window.PeonyCanvas.stopSpin();
      window.PeonyCanvas.resizeAndRedraw();
    }

    musicAudio = preloadedAudios[0];
    trackNameSpan.innerText = playlist[0].name;

    musicAudio.currentTime = 0; // ← с начала при открытии
    await musicAudio.play().catch(console.log);
    await fadeIn(musicAudio, 0.4);
    isPlaying = true;
    playPauseBtn.innerHTML = "⏸️";

    if (window.PeonyCanvas) {
      window.PeonyCanvas.setPlaying(true);
      window.PeonyCanvas.startSpin();
    }
    startProgressTracking();

    isBoomboxOpen = true;
    isAnimatingTransition = false;
  }

  // ---------------------- ЗАКРЫТИЕ ----------------------
  async function closeBoomboxWithPacket() {
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

    boombox.classList.remove("open");
    document.body.classList.remove("open-mode");

    hero.style.display = "flex";
    zippacket.style.display = "block";

    zippacket.classList.remove("fly-down", "opening");
    zippacket.classList.add("fly-up");

    await new Promise((r) => setTimeout(r, 2700));

    zippacket.classList.remove("fly-up");
    zippacket.style.transform = "";
    zippacket.style.opacity = "";

    if (window.PeonyCanvas) window.PeonyCanvas.stop();

    isBoomboxOpen = false;
    isAnimatingTransition = false;
  }

  // ---------------------- СВАЙПЫ ----------------------
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
  }

  function handleTouchEnd(e) {
    if (!isBoomboxOpen || !touchMoved || isSwitchingTrack) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      deltaX < 0 ? nextTrack() : prevTrack();
    } else if (Math.abs(deltaY) > 45 && deltaY > 0) {
      closeBoomboxWithPacket();
    }
    if (navigator.vibrate) navigator.vibrate(20);
    touchMoved = false;
  }

  // ---------------------- BIND ----------------------
  function bindEvents() {
    zippacket.addEventListener("click", openBoomboxWithPacket);
    prevBtn.addEventListener(
      "click",
      () => isBoomboxOpen && !isSwitchingTrack && prevTrack(),
    );
    nextBtn.addEventListener(
      "click",
      () => isBoomboxOpen && !isSwitchingTrack && nextTrack(),
    );
    playPauseBtn.addEventListener("click", togglePlayPause);
    volumeSlider.addEventListener("input", (e) =>
      setVolumeForAll(parseFloat(e.target.value)),
    );

    boombox.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    boombox.addEventListener("touchmove", handleTouchMove, { passive: false });
    boombox.addEventListener("touchend", handleTouchEnd);

    window.addEventListener("resize", () => {
      if (isBoomboxOpen && window.PeonyCanvas)
        window.PeonyCanvas.resizeAndRedraw();
    });
  }

  // ---------------------- INIT ----------------------
  preloadAllTracks();
  setVolumeForAll(0.7);
  bindEvents();

  boombox.classList.remove("open");
  hero.style.display = "flex";
  zippacket.style.display = "block";
  zippacket.classList.remove("opening", "fly-down", "fly-up");

  console.log("✅ Баг с паузой исправлен");
})();
