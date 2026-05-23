(function() {
    const SOUNDS = {
        open: './sounds/open_chest.mp3',
        close: './sounds/close_chest.mp3'
    };
    
    let playlist = [
        { name: "🎂 Поздравление с 17-летием! 🎂", src: "./sounds/birthday.mp3", colorTheme: "pinkCoral" },
        { name: "💖 Улыбайся)) 💖", src: "./sounds/favorite.mp3", colorTheme: "vibrantPink" },
        { name: "🌸 Пион-бонус трек 🌸", src: "./sounds/surprise.mp3", colorTheme: "magenta" }
    ];
    
    // DOM элементы
    const hero = document.getElementById('heroScreen');
    const boombox = document.getElementById('boombox');
    const openBtn = document.getElementById('openBtn');
    const closeBtn = document.getElementById('closeBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const trackNameSpan = document.getElementById('trackName');
    const canvasElem = document.getElementById('peonyCanvas');
    
    // Состояния
    let currentSongIndex = 0;
    let musicAudio = new Audio();
    musicAudio.loop = true;
    musicAudio.volume = 0.7;
    
    let openSound = new Audio(SOUNDS.open);
    let closeSound = new Audio(SOUNDS.close);
    openSound.preload = "auto";
    closeSound.preload = "auto";
    
    let isPlaying = false;
    let isBoomboxOpen = false;
    let isSwitchingTrack = false;
    let isAnimatingTransition = false;
    
    // Свайпы
    let touchStartX = 0, touchStartY = 0;
    let touchMoved = false;
    
    // Вращение пиона
    function updateSpinState() {
        if (!isBoomboxOpen || !window.PeonyCanvas) return;
        if (isPlaying) window.PeonyCanvas.startSpin();
        else window.PeonyCanvas.stopSpin();
    }
    
    // Анимация смены диска
    function animateTrackSwitch(direction, callback) {
        if (isSwitchingTrack) return;
        isSwitchingTrack = true;
        if (window.PeonyCanvas) window.PeonyCanvas.stopSpin();
        let flyOutClass = direction === 'next' ? 'canvas-fly-out-right' : 'canvas-fly-out-left';
        let flyInClass = direction === 'next' ? 'canvas-fly-in-left' : 'canvas-fly-in-right';
        canvasElem.classList.add(flyOutClass);
        setTimeout(() => {
            canvasElem.classList.remove(flyOutClass);
            canvasElem.style.transform = '';
            canvasElem.style.opacity = '';
            const newTheme = playlist[currentSongIndex]?.colorTheme || 'pinkCoral';
            if (window.PeonyCanvas) {
                window.PeonyCanvas.setTheme(newTheme);
                window.PeonyCanvas.resetRotation();
                window.PeonyCanvas.resizeAndRedraw();
            }
            canvasElem.classList.add(flyInClass);
            setTimeout(() => {
                canvasElem.classList.remove(flyInClass);
                updateSpinState();
                isSwitchingTrack = false;
                if (callback) callback();
            }, 700);
        }, 700);
    }
    
    function loadSong(index, direction) {
        const song = playlist[index];
        if (!song) return;
        const wasPlaying = isPlaying;
        if (wasPlaying) musicAudio.pause();
        musicAudio.src = song.src;
        musicAudio.load();
        trackNameSpan.innerText = song.name;
        animateTrackSwitch(direction, () => {
            if (wasPlaying && isBoomboxOpen) {
                musicAudio.play().catch(e => console.log("play error", e));
                isPlaying = true;
                playPauseBtn.innerHTML = '⏸️';
                updateSpinState();
            } else {
                playPauseBtn.innerHTML = '▶️';
            }
        });
    }
    
    function playMusic() {
        if (!isBoomboxOpen) return;
        musicAudio.play().then(() => {
            isPlaying = true;
            playPauseBtn.innerHTML = '⏸️';
            updateSpinState();
        }).catch(e => {
            console.log("play error", e);
            isPlaying = false;
            playPauseBtn.innerHTML = '▶️';
            updateSpinState();
        });
    }
    
    function pauseMusic() {
        musicAudio.pause();
        isPlaying = false;
        playPauseBtn.innerHTML = '▶️';
        updateSpinState();
    }
    
    function togglePlayPause() {
        if (!isBoomboxOpen || isSwitchingTrack) return;
        if (isPlaying) pauseMusic();
        else playMusic();
    }
    
    function nextTrack() {
        if (!isBoomboxOpen || isSwitchingTrack) return;
        currentSongIndex = (currentSongIndex + 1) % playlist.length;
        loadSong(currentSongIndex, 'next');
    }
    
    function prevTrack() {
        if (!isBoomboxOpen || isSwitchingTrack) return;
        currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        loadSong(currentSongIndex, 'prev');
    }
    
    function setVolume(value) {
        musicAudio.volume = value;
        volumeSlider.value = value;
    }
    
    // Открытие
    function openBoombox() {
        if (isBoomboxOpen || isAnimatingTransition) return;
        isAnimatingTransition = true;
        openSound.currentTime = 0;
        openSound.play().catch(e=>console.log);
        hero.classList.add('hide');
        document.body.classList.add('open-mode'); // сдвиг картинок
        setTimeout(() => {
            isBoomboxOpen = true;
            boombox.classList.add('open');
            if (window.PeonyCanvas && canvasElem) {
                window.PeonyCanvas.start(canvasElem, playlist[currentSongIndex]?.colorTheme || 'pinkCoral');
                window.PeonyCanvas.stopSpin();
                setTimeout(() => window.PeonyCanvas.resizeAndRedraw(), 30);
            }
            const song = playlist[currentSongIndex];
            musicAudio.src = song.src;
            musicAudio.load();
            trackNameSpan.innerText = song.name;
            playMusic();
            isAnimatingTransition = false;
        }, 900);
    }
    
    // Закрытие
    function closeBoombox() {
        if (!isBoomboxOpen || isAnimatingTransition) return;
        isAnimatingTransition = true;
        closeSound.currentTime = 0;
        closeSound.play().catch(e=>console.log);
        boombox.classList.add('closing');
        setTimeout(() => {
            pauseMusic();
            if (window.PeonyCanvas) window.PeonyCanvas.stop();
            boombox.classList.remove('open', 'closing');
            isBoomboxOpen = false;
            document.body.classList.remove('open-mode'); // возврат дня
            hero.classList.remove('hide');
            isAnimatingTransition = false;
        }, 400);
    }
    
    // Свайпы
    const touchZone = document.getElementById('vinylTouchZone');
    function handleTouchStart(e) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchMoved = false;
    }
    function handleTouchMove(e) {
        if (!isBoomboxOpen || isSwitchingTrack) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) touchMoved = true;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) e.preventDefault();
        else if (Math.abs(deltaY) > 20 && deltaY > 0) e.preventDefault();
    }
    function handleTouchEnd(e) {
        if (!isBoomboxOpen || !touchMoved || isSwitchingTrack) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
            if (deltaX > 0) prevTrack();
            else nextTrack();
            e.preventDefault();
        } else if (Math.abs(deltaY) > 45 && deltaY > 0) {
            closeBoombox();
            e.preventDefault();
        }
        touchMoved = false;
    }
    
    // Инициализация
    function initCanvasResize() {
        const resize = () => {
            if (isBoomboxOpen && window.PeonyCanvas) window.PeonyCanvas.resizeAndRedraw();
        };
        window.addEventListener('resize', resize);
        resize();
    }
    
    function preloadAudios() {
        musicAudio.preload = 'auto';
        openSound.load();
        closeSound.load();
        playlist.forEach(s => { let a = new Audio(); a.src = s.src; a.preload = 'auto'; });
    }
    
    function bindEvents() {
        openBtn.addEventListener('click', openBoombox);
        closeBtn.addEventListener('click', closeBoombox);
        prevBtn.addEventListener('click', () => { if(isBoomboxOpen && !isSwitchingTrack) prevTrack(); });
        nextBtn.addEventListener('click', () => { if(isBoomboxOpen && !isSwitchingTrack) nextTrack(); });
        playPauseBtn.addEventListener('click', togglePlayPause);
        volumeSlider.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));
        touchZone.addEventListener('touchstart', handleTouchStart, {passive: false});
        touchZone.addEventListener('touchmove', handleTouchMove, {passive: false});
        touchZone.addEventListener('touchend', handleTouchEnd);
    }
    
    initCanvasResize();
    bindEvents();
    preloadAudios();
    console.log("✅ Фон через img, день/ночь, магнитола с пионом, свайпы, вращение диска");
})();