const appShellTemplate = `<aside class="sidebar">

    <button class="menu-btn" aria-label="Mở menu">
      <span class="menu-icon">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </span>
    </button>

    <div class="logo">
      <div class="logo-brand">
        <span class="logo-mark">♫</span>
        <span class="logo-name">Music</span>
      </div>
    </div>

    <nav class="sidebar-menu" id="sidebarMenu" aria-label="Điều hướng chính">
      <div class="sidebar-primary">
        <button class="sidebar-item" data-page="home">
          <span class="icon">⌂</span>
          <span>Trang chủ</span>
        </button>

        <button class="sidebar-item" data-page="explore">
          <span class="icon">◉</span>
          <span>Khám phá</span>
        </button>

        <button class="sidebar-item" data-page="library">
          <span class="icon">♡</span>
          <span>Thư viện</span>
        </button>
      </div>

      <div class="sidebar-divider"></div>

      <section class="sidebar-section">
        <h2 class="sidebar-section-title">Khám phá</h2>
        <button class="sidebar-item small-item" data-explore-target="newReleases">
          <span class="icon">◉</span>
          <span>Bản phát hành mới</span>
        </button>
        <button class="sidebar-item small-item" data-explore-target="charts">
          <span class="icon">⌁</span>
          <span>Bảng xếp hạng</span>
        </button>
        <button class="sidebar-item small-item" data-explore-target="categories">
          <span class="icon">☺</span>
          <span>Tâm trạng &amp; Thể loại</span>
        </button>
      </section>

      <section class="sidebar-section sidebar-dynamic-section sidebar-lines-section">
        <button class="sidebar-item sidebar-lines-toggle" type="button" aria-expanded="false" aria-controls="linesFlyout">
          <span class="icon">♪</span>
          <span>Dòng nhạc</span>
          <span class="sidebar-chevron" aria-hidden="true">›</span>
        </button>
      </section>

      <section class="sidebar-section sidebar-dynamic-section">
        <h2 class="sidebar-section-title">Tâm trạng &amp; Thể loại</h2>
        <div id="sidebarCategories" aria-live="polite">
          <p class="sidebar-status">Đang tải...</p>
        </div>
      </section>
    </nav>

  </aside>

  <aside class="lines-flyout" id="linesFlyout" aria-label="Danh sách dòng nhạc" hidden>
    <h2 class="lines-flyout-title">Dòng nhạc</h2>
    <div id="sidebarLines" aria-live="polite">
      <p class="sidebar-status">Đang tải...</p>
    </div>
  </aside>


  <div class="page">

    <header class="header">

      <div class="search-box" role="search">

        <button id="searchSubmit" class="search-submit" type="button" aria-label="Tìm kiếm">⌕</button>

        <input id="searchInput" type="search" placeholder="Tìm bài hát, đĩa nhạc, nghệ sĩ" autocomplete="off" aria-label="Tìm kiếm">
        <div class="search-panel" id="searchPanel" role="listbox" hidden></div>

      </div>

      <div class="header-actions">
        <div class="account-container">
          <button class="header-login" type="button" aria-label="Đăng nhập" aria-expanded="false">
            <span class="account-avatar" id="accountAvatar" aria-hidden="true"></span>
            <span class="account-label" id="accountLabel">Đăng nhập</span>
          </button>

          <div class="account-menu" id="accountMenu" aria-label="Tài khoản">
            <button id="accountProfileButton" type="button">Thông tin cá nhân</button>
            <button id="logoutButton">Đăng xuất</button>
          </div>
        </div>

      </div>

    </header>


    <!-- CHỈ KHU VỰC NÀY THAY ĐỔI -->
    <main id="content"></main>

    <footer class="audio-player" id="audioPlayerBar" aria-label="Trình phát nhạc" hidden>
      <div class="youtube-player-host" id="youtubePlayerHost">
        <div id="youtubePlayer"></div>
      </div>

      <div class="player-track">
        <img id="playerCover" src="" alt="">
        <div class="player-track-info">
          <div class="player-track-heading">
            <h2 id="playerTitle">Chưa phát nhạc</h2>
            <button id="addToPlaylistButton" type="button" aria-label="Thêm vào playlist" title="Thêm vào playlist" hidden>＋</button>
            <button id="closePlayer" type="button" aria-label="Tắt trình phát nhạc">×</button>
          </div>
          <p id="playerArtist">Chọn một mục để nghe</p>
        </div>
      </div>

      <div class="player-controls">
        <div class="player-buttons">
          <button id="previousTrack" type="button" aria-label="Bài trước" disabled>|◀</button>
          <button id="togglePlayback" type="button" aria-label="Phát nhạc" disabled>▶</button>
          <button id="nextTrack" type="button" aria-label="Bài tiếp theo" disabled>▶|</button>
        </div>
        <div class="player-timeline">
          <span id="currentTime">0:00</span>
          <input id="seekRange" type="range" min="0" max="100" value="0" aria-label="Vị trí phát">
          <span id="trackDuration">0:00</span>
        </div>
      </div>

      <div class="player-volume">
        <button id="toggleMute" type="button" aria-label="Tắt tiếng">🔊</button>
        <input id="volumeRange" type="range" min="0" max="1" step="0.01" value="0.7" aria-label="Âm lượng">
      </div>
    </footer>

    <dialog class="playlist-dialog" id="playlistDialog" aria-labelledby="playlistDialogTitle">
      <div class="playlist-dialog-header">
        <div>
          <h2 id="playlistDialogTitle">Thêm vào playlist</h2>
          <p id="playlistDialogTrack"></p>
        </div>
        <button id="closePlaylistDialog" type="button" aria-label="Đóng">×</button>
      </div>
      <section id="playlistChoicesSection">
        <h3>Playlist của bạn</h3>
        <div id="playlistChoices"></div>
      </section>
      <form class="playlist-create-form" id="playlistCreateForm">
        <label for="newPlaylistName">Tạo playlist mới</label>
        <div>
          <input id="newPlaylistName" type="text" maxlength="80" placeholder="Tên playlist" required>
          <button id="createPlaylistSubmit" type="submit">Tạo</button>
        </div>
      </form>
      <p id="playlistDialogMessage" class="playlist-dialog-message" role="status"></p>
      <p class="playlist-local-note">Playlist được lưu trên thiết bị này.</p>
    </dialog>

  </div>`;

export function mountAppShell(root) {
    root.innerHTML = appShellTemplate;
    return root;
}
