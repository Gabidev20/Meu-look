# Meu Look

Guarda-roupa pessoal com um stylist de IA. Cada pessoa tem login próprio e só vê as próprias peças.

- **Guarda-roupa:** tire a foto da peça no celular, a IA (Claude) preenche nome, categoria, cores, estilo, formalidade e estação.
- **Criar look:** diga a ocasião ("jantar", "trabalho", "dia frio"…) e a IA monta 3 looks **só com as suas peças**, explicando por quê.
- **Meus looks:** salve os favoritos e marque "Usei hoje"; a IA evita repetir o que você usou recentemente.

Stack: Next.js 16 · Supabase (login, banco e fotos privadas) · Claude API · hospedagem na Vercel.

---

## Como colocar no ar (uma vez só)

### 1. Supabase (banco + fotos + login): grátis
1. Crie uma conta em https://supabase.com e um projeto novo (região *South America (São Paulo)*).
2. Menu **SQL Editor** → cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Menu **Authentication → Sign In / Providers → Email**: desligue **Confirm email** se não quiser confirmar pelo e-mail (mais simples para uso pessoal).
4. Menu **Project Settings → API Keys**: copie a **Project URL** e a **Publishable key**.

### 2. Anthropic (a IA)
1. Crie uma conta em https://console.anthropic.com, adicione créditos (US$ 5 duram bastante) e crie uma **API key**.

### 3. Rodar no computador (opcional, para testar)
```bash
cp .env.example .env.local   # e preencha as 3 variáveis
npm install
npm run dev
```
Abra http://localhost:3000.

### 4. Publicar na Vercel: grátis
1. Suba esta pasta para um repositório no GitHub.
2. Em https://vercel.com → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `ANTHROPIC_API_KEY`.
4. **Deploy**. Você recebe um endereço tipo `meu-look.vercel.app`.

### 5. No celular
Abra o endereço, crie sua conta e use **Compartilhar → Adicionar à Tela de Início** (iPhone) ou **⋮ → Instalar app** (Android). Fica com cara de aplicativo.

> Depois que você e sua irmã criarem as contas, dá para bloquear novos cadastros em
> Supabase → **Authentication → Sign In / Providers → Allow new users to sign up** (desligar).

---

## Custos estimados
- Supabase e Vercel: plano grátis atende tranquilamente duas pessoas.
- Claude: cada peça analisada ou rodada de 3 looks custa alguns centavos de dólar.

## Próximos passos
- Provador virtual: enviar uma foto de corpo inteiro e gerar uma imagem vestindo o look.
- Remoção automática do fundo das fotos das peças.
- Cadastrar looks completos a partir de uma foto sua vestida.
