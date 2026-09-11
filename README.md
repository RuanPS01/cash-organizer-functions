# Cash Organizer: backend Firebase (Firestore)

Configurações de backend do Cash Organizer: **Firestore rules** e **indexes**, com
pipeline de deploy automático para o Firebase.

O app roda 100% no frontend (repositório `cash-organizer-web`), conversando
diretamente com o Firestore — **toda a lógica de funcionamento fica no web app**,
e este repositório é a fonte da verdade das regras de segurança. Não há Cloud
Functions, então tudo funciona no **plano gratuito (Spark)** do Firebase.

## Estrutura

```
firebase.json            configuração do projeto (firestore + emulador)
.firebaserc              alias do projeto (troque pelo id do seu projeto p/ uso local)
firestore.rules          regras de segurança do Firestore
firestore.indexes.json   índices compostos (nenhum necessário por enquanto)
```

### Regras de segurança

O app não usa Firebase Auth: o acesso é protegido pelo conhecimento do nome +
senha do compartimento (o cliente valida o hash SHA-256 armazenado). As regras:

- bloqueiam `list` na coleção `compartments` (não dá para enumerar compartimentos);
- tornam o `passwordHash` e o nome do compartimento imutáveis, deixando mudar
  só o mês corrente (`currentMonth`) e a categoria acompanhada no card da
  semana (`weekCategoryId`), que fica no compartimento para a escolha valer em
  qualquer aparelho;
- validam a estrutura básica dos documentos (tipos, valores em centavos >= 0 etc.);
- em `expenses`, liberam a edição do lançamento feita no histórico do mês:
  `amount`, `description`, a classificação (`categoryId`, `categoryName`,
  `originId`, `originName`) e a data do gasto (`createdAt` e `week`, que andam
  juntos porque a semana é derivada da data). A reclassificação em lote usa a
  mesma regra, tocando só a classificação. Qualquer outro campo segue
  bloqueado, e o lançamento nunca muda de mês: editar a data reescreve os dois
  campos, não move o documento de coleção;
- em `months/{ym}/originEntries`, liberam a linha de origem do mês (nome e
  status de pagamento), que é como a aba Pagamento acompanha o que já foi pago
  em cada forma de pagamento;
- no documento do mês, aceitam `currentWeek` (a semana corrente, de 1 a 4, que
  o usuário vira no botão da aba Adicionar) e `weekChangedAt`.

O Firestore nega tudo que não está explicitamente liberado, então **coleção nova
no app exige bloco novo aqui**. Hoje existem `fixedExpenses`, `categories`,
`origins` e `months` (com `fixedEntries`, `categoryEntries`, `originEntries` e
`expenses`). Sem o bloco, a tela do app falha com `permission-denied` sem
conseguir nem listar.

## Desenvolvimento local

```bash
# emulador do Firestore com as rules deste repo
npx firebase-tools emulators:start
```

## Deploy (GitHub Actions)

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda a
cada push na `main` e executa:

```
firebase deploy --only firestore --project $FIREBASE_PROJECT_ID
```

Secrets necessárias em **Settings → Secrets and variables → Actions**:

| Secret | Conteúdo |
| --- | --- |
| `FIREBASE_PROJECT_ID` | O id do projeto no Firebase (ex.: `cash-organizer-a1b2c`). |
| `FIREBASE_SERVICE_ACCOUNT` | O JSON completo de uma chave de service account com permissão de deploy (**Service Accounts → Keys → Add key → JSON**). Cole o conteúdo do arquivo inteiro na secret. |

### Papéis (IAM) da service account

A service account usada no deploy (pode ser a `firebase-adminsdk` do projeto)
precisa dos papéis abaixo em **IAM & Admin → IAM → editar principal**:

| Papel | Motivo |
| --- | --- |
| **Firebase Admin** (`roles/firebase.admin`) | Deploy das rules e indexes do Firestore. |
| **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`) | O firebase-tools checa se as APIs do projeto estão habilitadas; sem isso o deploy falha com `403 Permission denied to get service [firestore.googleapis.com]`. |

## E se um dia eu precisar de Cloud Functions?

Functions exigem o plano Blaze. Se o projeto for atualizado no futuro, basta
recriar o diretório `functions/` (o histórico deste repositório tem uma versão
funcional em TypeScript), voltar o bloco `functions` no `firebase.json` e trocar
o `--only firestore` do workflow por `--only firestore,functions` — além de
adicionar o papel **Service Account User** à service account e habilitar as APIs
`cloudfunctions`, `cloudbuild`, `artifactregistry`, `eventarc`, `run` e `pubsub`.
