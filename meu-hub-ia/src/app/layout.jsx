import "./globals.css";

export const metadata = {
  title: "Hub de IAs",
  description: "Compare respostas do ChatGPT, Gemini e Grok ao mesmo tempo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>
        {children}
      </body>
    </html>
  );
}