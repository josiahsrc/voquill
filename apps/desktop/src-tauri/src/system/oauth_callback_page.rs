pub fn success_html() -> &'static str {
    r##"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign-in successful</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #FFFFFF;
  }

  .wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 400px;
    width: 90%;
    color: #12151C;
  }

  .logo { width: 48px; height: 48px; margin-bottom: 16px; }

  .card {
    text-align: center;
    background: #F5F5F5;
    color: #12151C;
    border-radius: 12px;
    padding: 32px 40px;
    width: 100%;
  }

  h1 {
    font-size: 24px;
    font-weight: 500;
    margin-bottom: 12px;
  }

  .subtitle {
    font-size: 16px;
    line-height: 1.4;
    color: #404040;
  }

  @media (prefers-color-scheme: dark) {
    body { background: #121212; }
    .wrapper { color: #FFFFFF; }
    .card { background: #1C1C1C; color: #FFFFFF; }
    .subtitle { color: #B3B3B3; }
  }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <svg class="logo" width="128" height="128" viewBox="0 0 128 128" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M75.3206 52.5707L19.8206 108.071" stroke-width="9" stroke-linecap="round"/>
        <path d="M32.1525 94.8831L27.4937 59.8648C27.2023 57.6748 27.8296 55.4619 29.2267 53.7505L53.5296 23.9816C55.622 21.4186 59.0762 20.4081 62.2201 21.4393L94.883 32.1527" stroke-width="12" stroke-linecap="round"/>
        <path d="M32.7586 95.4893L67.7769 100.148C69.9669 100.44 72.1798 99.8123 73.8912 98.4151L103.66 74.1122C106.223 72.0198 107.234 68.5656 106.202 65.4218L95.489 32.7588" stroke-width="12" stroke-linecap="round"/>
      </svg>
      <h1>Sign-in successful</h1>
      <p class="subtitle">You can now close this window and return to the app to continue.</p>
    </div>
  </div>
</body>
</html>"##
}
