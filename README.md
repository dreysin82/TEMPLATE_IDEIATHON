# Ideiathon - Criador de Projetos

Aplicação web estática para turmas montarem projetos com:
- formulário em etapas,
- escolha de 4 layouts,
- link por projeto (`?view=<id>`),
- armazenamento local no navegador,
- exportação/importação em JSON.

## Como rodar

1. Entre na pasta do projeto.
2. Suba um servidor estático:

```bash
python3 -m http.server 8080
```

3. Abra no navegador:

```text
http://localhost:8080/INDEX_MODELO.HTML
```

## Roteiro de teste rápido (sala de aula)

1. Clique em **Começar agora**.
2. Preencha as 6 etapas e finalize.
3. Selecione um dos 4 layouts.
4. Copie o link do projeto.
5. Troque de layout na tela final para validar atualização instantânea.
6. Abra **Meus projetos** e valide:
   - abrir projeto salvo,
   - exportar JSON,
   - importar JSON.

## Observações importantes

- Sem backend: os projetos ficam no `localStorage` do navegador.
- Para mover projeto entre máquinas, use **Exportar JSON** e depois **Importar JSON**.
