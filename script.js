// 設定 CSV 連結
        async function fetchData() {
            try {
                const res = await fetch('/api/cards');
                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }
                const data = await res.json();
                
                allCards = data.filter(item => item.word && item.word.trim() !== '');
                
                if (allCards.length > 0) {
                    currentIndex = 0;
                    renderCard();
                    document.getElementById('counterBadge').innerText = `${currentIndex + 1} / ${allCards.length}`;
                } else {
                    showError("資料庫是空的");
                }
            } catch (err) {
                console.error(err);
                showError("連線失敗");
            }
        }

        function showError(msg) {
            document.getElementById('frontWord').innerHTML = `<span class='text-lg text-red-500'>${msg}</span>`;
            document.getElementById('frontWord').classList.remove('text-5xl');
            document.getElementById('counterBadge').innerText = "Error";
        }

        function renderCard() {
            if (allCards.length === 0) return;
            const card = allCards[currentIndex];
            const cardEl = document.getElementById('flashcard');
            
            document.getElementById('frontWord').classList.add('text-5xl');

            if (isFlipped) {
                cardEl.classList.remove('is-flipped');
                isFlipped = false;
                setTimeout(() => updateContent(card), 200);
            } else {
                updateContent(card);
            }
        }

        function updateContent(card) {
            document.getElementById('frontWord').innerText = card.word;
            document.getElementById('backReading').innerText = card.reading;
            document.getElementById('backMeaning').innerText = card.meaning;
            document.getElementById('backSentence').innerText = card.sentence;
            document.getElementById('backAntonym').innerText = card.antonym;
            document.getElementById('backGrammar').innerText = card.grammar;
            document.getElementById('counterBadge').innerText = `${currentIndex + 1} / ${allCards.length}`;
        }

        function toggleFlip() {
            const cardEl = document.getElementById('flashcard');
            isFlipped = !isFlipped;
            if (isFlipped) {
                cardEl.classList.add('is-flipped');
                setTimeout(() => playAudio(), 400); 
            } else {
                cardEl.classList.remove('is-flipped');
            }
        }

        function changeCard(direction) {
            const newIndex = currentIndex + direction;
            if (newIndex >= 0 && newIndex < allCards.length) {
                currentIndex = newIndex;
                renderCard();
            }
        }

        function shuffleCards() {
            if (allCards.length === 0) return;
            for (let i = allCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
            }
            currentIndex = 0;
            renderCard();
        }

        function playAudio(e) {
            if (e) e.stopPropagation();
            if (allCards.length === 0) return;
            const text = allCards[currentIndex].word;

            if ('speechSynthesis' in window) {
                const synth = window.speechSynthesis;
                synth.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ja-JP';
                utterance.rate = 0.8;

                if (availableVoices.length === 0) availableVoices = synth.getVoices();
                const jaVoice = availableVoices.find(v => v.lang === 'ja-JP' || v.name.includes('Japanese'));
                if (jaVoice) {
                    utterance.voice = jaVoice;
                }
                synth.speak(utterance);
            }
        }

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') toggleFlip();
            if (e.code === 'ArrowRight') changeCard(1);
            if (e.code === 'ArrowLeft') changeCard(-1);
        });