# Eduarda Beauty

Site estático (HTML/CSS/JS) para GitHub Pages. Feito para Eduarda.

## Páginas
`index.html` (início), `pele.html`, `base.html` (consultoria), `looks.html`, `produtos.html`, `marcas.html`, `favoritos.html`, `espaco.html` (nécessaire, notas, dados) e `admin.html` (administração). Menu inferior no celular.

## Já funciona (sem configurar nada)
Consultoria de base e corretivo com nível de confiança, guia de subtom e comparador lado a lado.
Perfil de beleza, perguntas visuais ("Descubra seu estilo"), recomendações com motivo, catálogo com busca/filtro/ordenação, marcas com explicação, favoritos, comparador, notas, exportar e apagar dados, guia "Encontrar meu tom", teclado/leitor de tela, rodapé com dedicatória.
**Atenção:** em modo demonstração tudo fica só no navegador, e o catálogo (js/catalog.js) traz marcas e produtos reais, mas sem preço, foto nem link de compra, exceto onde verificado.

## Novidades
Looks por ocasião ("Surpreenda-me"), nécessaire pessoal (tenho/quero/acabando, preço, tom e notas), cadastro de produtos próprios, lista de compras com total, e **app instalável (PWA)**: abre offline e guarda tudo no celular. No GitHub Pages (HTTPS) o navegador oferece "Instalar"; no iPhone use Compartilhar > Adicionar à Tela de Início. Ao publicar mudanças, aumente `VERSION` em `sw.js`.

## Depende de configuração
1. **Nuvem:** crie um projeto no Supabase, rode `supabase/schema.sql`, ative Auth por e-mail, adicione a URL do GitHub Pages em Auth > URL Configuration, e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` (chave *anon*, pública) em `js/config.js`. **Nunca** use a `service_role`.
2. **Produtos reais:** substitua `PRODUCTS` e `BRANDS` em `js/app.js` só com dados verificados (preço, tom, link oficial). As tabelas `products`/`brands`/`admins` já existem no SQL.
3. **Painel admin (`admin.html`):** cadastro, edição, exclusão, destaque e ocultação de produtos e marcas, com preço, links, imagem, tons e argumento. A segurança está no banco: só quem está na tabela `admins` escreve (RLS). Passos: (a) rode todo o `schema.sql`; (b) abra `admin.html` e entre uma vez com seu e-mail; (c) no SQL Editor rode o `insert into public.admins ...` que está no fim do `schema.sql`, com seu e-mail; (d) recarregue `admin.html` e use "Importar catálogo inicial". Daí em diante o site público lê o catálogo do banco e o que você editar aparece para a Eduarda. Links e imagens só aceitam `https://`. A página `admin.html` não é divulgada no menu.

## Publicar
Suba os arquivos a um repositório → Settings → Pages → Deploy from branch `main` / root.

## Checklist de testes
- [ ] Abrir em celular e desktop; navegar só pelo teclado.
- [ ] Responder perguntas, recarregar: preferências persistem.
- [ ] "Não é meu estilo" remove o produto da lista.
- [ ] Favoritar 2 itens: aparece a comparação.
- [ ] Exportar e apagar dados.
- [ ] Com Supabase: entrar por e-mail, salvar, abrir em outro aparelho; conferir que outra conta não vê seus dados.
