import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user }) {
      console.log("🔑 GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
      console.log("🔑 GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "****" : "❌ undefined");
      console.log("🌐 NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);

      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
        console.log("📡 Llamando a backend:", apiUrl);

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
          }),
        });

        console.log("📡 Backend response status:", res.status);

        if (!res.ok) {
          console.error("❌ No se pudo registrar el usuario en el backend");
          return false;
        }
        return true;
      } catch (error) {
        console.error("❌ Error en signIn callback:", error);
        return false;
      }
    },

    async session({ session }) {
      console.log("✅ Sesión creada:", session.user?.email);
      return session;
    },
  },
  debug: true, // 👈 esto mostrará info extra de NextAuth
});

export { handler as GET, handler as POST };
