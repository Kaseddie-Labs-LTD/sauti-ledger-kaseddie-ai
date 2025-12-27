function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-lg mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎃</span>
              <h3 className="text-lg font-bold text-neon-purple">Kaseddie AI</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Autonomous crypto trading agent powered by AI. Built for the Kiroween Hackathon {currentYear}.
            </p>
            <div className="flex gap-3">
              <a href="#" className="text-slate-400 hover:text-neon-purple transition-colors">
                <span className="text-xl">🐦</span>
              </a>
              <a href="#" className="text-slate-400 hover:text-neon-purple transition-colors">
                <span className="text-xl">💬</span>
              </a>
              <a href="#" className="text-slate-400 hover:text-neon-purple transition-colors">
                <span className="text-xl">📧</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  📊 Markets
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  💱 Trade
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  📰 News
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  📚 Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  🎓 Learn
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  🔑 API Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  🛡️ Security
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  📖 Trading Guide
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  💬 Community
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-neon-green transition-colors">
                  🆘 Support
                </a>
              </li>
            </ul>
          </div>

          {/* Download Apps */}
          <div>
            <h4 className="font-bold text-white mb-4">📱 Download Apps</h4>
            <div className="space-y-3">
              <a
                href="#"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700 hover:border-neon-purple/50"
              >
                <span className="text-2xl">🍎</span>
                <div>
                  <p className="text-xs text-slate-400">Download on the</p>
                  <p className="text-sm font-semibold text-white">App Store</p>
                </div>
              </a>

              <a
                href="#"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700 hover:border-neon-purple/50"
              >
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-xs text-slate-400">Get it on</p>
                  <p className="text-sm font-semibold text-white">Google Play</p>
                </div>
              </a>

              <a
                href="#"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700 hover:border-neon-purple/50"
              >
                <span className="text-2xl">💻</span>
                <div>
                  <p className="text-xs text-slate-400">Download for</p>
                  <p className="text-sm font-semibold text-white">Desktop</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500 text-center md:text-left">
              <p>
                © {currentYear} Kaseddie AI. All rights reserved.
              </p>
              <p className="text-xs mt-1">
                Built with 🎃 for Kiroween Hackathon
              </p>
            </div>

            <div className="flex gap-6 text-sm">
              <a href="#" className="text-slate-400 hover:text-neon-purple transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-slate-400 hover:text-neon-purple transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-slate-400 hover:text-neon-purple transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>

          {/* Tech Stack Badge */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
              <span className="text-xs text-slate-400">Powered by:</span>
              <span className="text-xs font-semibold text-neon-green">Google Vertex AI</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-neon-purple">Binance API</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-blue-400">WorkOS</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
