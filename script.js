document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // EKİP ÜYELERİ LİSTESİ (Discord ID'leri)
    // ---------------------------------------------------------
    const teamMembers = [
        { id: '1313475119716368485' },
        { id: '578816597054193664' },
        { id: '384385365815066624' }
    ];

    const teamGrid = document.getElementById('teamGrid');

    // Sunucu kapalıyken veya hata durumunda kullanılacak SVG avatar şablonu
    const svgAvatarFallback = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="team-avatar" style="padding: 22px; background: rgba(255,255,255,0.02); display: block;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    `;

    if (teamGrid) {
        teamGrid.innerHTML = ''; // Temizle

        // Eğer sayfa file:// protokolü ile açılmışsa, yerel sunucu adresini (http://localhost:3000) baz al.
        // Aksi takdirde sunucu üzerinde çalışacağı için göreceli yol kullan.
        const apiBase = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

        teamMembers.forEach(member => {
            // Kart alanını oluştur
            const card = document.createElement('div');
            card.className = 'team-card';
            
            // Yükleniyor durumunu ekle
            card.innerHTML = `
                <div class="team-avatar" style="background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; justify-content: center; width: 100px; height: 100px; border-radius: 50%; border: 2px solid var(--border-color);">
                    <span style="font-size: 0.7rem; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.1em;">Yükleniyor</span>
                </div>
                <div class="team-info">
                    <span class="team-name" style="opacity: 0.5;">...</span>
                </div>
            `;
            teamGrid.appendChild(card);

            // API üzerinden Discord kullanıcı verilerini çek
            fetch(`${apiBase}/api/member/${member.id}`)
                .then(response => {
                    if (!response.ok) throw new Error('API request failed');
                    return response.json();
                })
                .then(data => {
                    if (data && !data.error && data.avatar_url) {
                        renderCardData(card, data.global_name, data.username, data.avatar_url);
                    } else if (data && !data.error) {
                        // Eğer API çalıştı ama avatar URL boş geldiyse (fallback durumu)
                        renderCardData(card, data.global_name, data.username, null);
                    } else {
                        showFallback(card, member.id);
                    }
                })
                .catch(error => {
                    // Sunucu çalışmıyorsa veya ağ hatası oluştuysa otomatik olarak yerel yedek verileri göster
                    console.log(`[INFO] Sunucu bağlantısı kurulamadı veya API hatası oluştu. Yedek şablon yükleniyor: ${member.id}`);
                    showFallback(card, member.id);
                });
        });
    }

    // Kart içeriğini güvenli bir şekilde oluşturan fonksiyon (HTML Tırnak çakışmalarını engeller)
    function renderCardData(cardElement, globalName, username, avatarUrl) {
        cardElement.innerHTML = ''; // Yükleniyor durumunu temizle

        if (avatarUrl) {
            // Resmi oluştur
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = globalName;
            img.className = 'team-avatar';
            
            // Eğer resim yüklenemezse (CDN hatası vb.) SVG şablonunu bas
            img.onerror = () => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = svgAvatarFallback.trim();
                img.replaceWith(tempDiv.firstElementChild);
            };
            
            cardElement.appendChild(img);
        } else {
            // Doğrudan SVG bas
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = svgAvatarFallback.trim();
            cardElement.appendChild(tempDiv.firstElementChild);
        }

        // İsim ve kullanıcı adı bilgilerini ekle
        const info = document.createElement('div');
        info.className = 'team-info';
        info.innerHTML = `
            <span class="team-name">${globalName}</span>
            <span class="team-username">@${username}</span>
        `;
        cardElement.appendChild(info);
    }

    function showFallback(cardElement, userId) {
        const mockNames = {
            '1313475119716368485': { global_name: 'Castellan Owner', username: 'castellan' },
            '578816597054193664': { global_name: 'Admin User', username: 'admin' },
            '384385365815066624': { global_name: 'Developer User', username: 'developer' }
        };

        const mock = mockNames[userId] || { global_name: 'Ekip Üyesi', username: 'ekip' };
        renderCardData(cardElement, mock.global_name, mock.username, null);
    }
});
