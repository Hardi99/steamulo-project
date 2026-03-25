#include "httplib.h"
#include "json.hpp"
#include <iostream>
#include <fstream>
#include <string>
#include <sstream>

using json = nlohmann::json;

// Decode base64 → binary
std::string b64_decode(const std::string& in) {
    static const std::string chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string out;
    int val = 0, valb = -8;
    for (unsigned char c : in) {
        auto pos = chars.find(c);
        if (pos == std::string::npos) break;
        val = (val << 6) + (int)pos;
        valb += 6;
        if (valb >= 0) {
            out.push_back((char)((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

void print_separator(char c = '-', int len = 60) {
    std::cout << std::string(len, c) << "\n";
}

int main(int argc, char* argv[]) {
    std::string topic;

    if (argc > 1) {
        // Topic depuis les arguments
        for (int i = 1; i < argc; ++i) {
            if (i > 1) topic += " ";
            topic += argv[i];
        }
    } else {
        // Mode interactif
        std::cout << "\n📰 BriefAI — Votre journaliste personnel\n";
        print_separator('=');
        std::cout << "Entrez un sujet : ";
        std::getline(std::cin, topic);
    }

    if (topic.empty()) {
        std::cerr << "Erreur : sujet vide\n";
        return 1;
    }

    std::cout << "\n🔍 Recherche en cours pour : \"" << topic << "\"\n";
    std::cout << "⏳ Votre journaliste consulte ses sources...\n\n";

    httplib::Client cli("localhost", 3000);
    cli.set_read_timeout(60, 0);  // 60s timeout (LLM peut être lent)

    json body;
    body["topic"] = topic;
    body["tone"] = "analytique";

    // Appel /brief-with-audio (texte + MP3)
    auto res = cli.Post("/brief-with-audio", body.dump(), "application/json");

    if (!res) {
        std::cerr << "❌ Impossible de joindre le serveur (localhost:3000)\n";
        std::cerr << "   → Lancez d'abord : npm run dev\n";
        return 1;
    }

    if (res->status != 200) {
        std::cerr << "❌ Erreur serveur " << res->status << " : " << res->body << "\n";
        return 1;
    }

    auto data = json::parse(res->body);

    // ── Affichage du brief ───────────────────────────────────────────────
    print_separator('=');
    std::cout << "📰 BRIEFING : " << topic << "\n";
    std::cout << "   modèle : " << data.value("model", "?") << "\n";
    print_separator('=');
    std::cout << "\n" << data["brief"].get<std::string>() << "\n\n";

    // Sources
    auto& sources = data["sources"];
    print_separator();
    std::cout << "📚 " << sources.size() << " source(s) consultée(s) :\n";
    for (auto& s : sources)
        std::cout << "   • " << s["title"].get<std::string>().substr(0, 70) << "\n"
                  << "     " << s["url"].get<std::string>() << "\n";
    print_separator();

    // ── Audio ────────────────────────────────────────────────────────────
    if (data.contains("audio_b64") && !data["audio_b64"].is_null()) {
        std::string decoded = b64_decode(data["audio_b64"].get<std::string>());

        std::string filename = "brief.mp3";
        std::ofstream f(filename, std::ios::binary);
        f.write(decoded.data(), decoded.size());
        f.close();

        std::cout << "\n🎙️  Audio généré → " << filename << "\n";

#ifdef _WIN32
        system(("start " + filename).c_str());
#elif __APPLE__
        system(("afplay " + filename + " &").c_str());
#else
        system(("mpg123 " + filename + " &").c_str());
#endif
    } else {
        std::cout << "\n⚠️  Pas d'audio (ELEVENLABS_API_KEY manquante)\n";
    }

    std::cout << "\n✅ Briefing terminé.\n\n";
    return 0;
}
