export default function AboutPage() {
  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-slate-800/10 bg-white/90 p-5 shadow-panel sm:p-7">
        <h1 className="text-4xl font-semibold leading-tight text-rust sm:text-5xl">
          О проекте
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-700">
          «Тогда / Сейчас» помогает изучать историю блокады Ленинграда через
          привязанные к карте городские точки. Пользователь может открыть место,
          сопоставить архивный и современный кадры, а затем перейти к источникам
          и краткой исторической справке.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-800/10 bg-white/95 p-5 shadow-panel sm:p-6">
          <h2 className="text-3xl font-semibold text-ink">Образовательная цель</h2>
          <p className="mt-2 text-base leading-relaxed text-slate-700">
            Сервис предназначен для школ, семейных экскурсий и самостоятельного
            изучения городской истории. Формат «фото тогда / фото сейчас»
            помогает точнее понять масштаб изменений и связать исторический
            материал с реальным городским пространством.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-800/10 bg-white/95 p-5 shadow-panel sm:p-6">
          <h2 className="text-3xl font-semibold text-ink">Контекст блокады</h2>
          <p className="mt-2 text-base leading-relaxed text-slate-700">
            В проекте используется период 1941-1944 годов, когда Ленинград
            находился в условиях блокады. Каждая карточка описывает место
            нейтральным языком, без сенсационности, с фокусом на проверяемые
            визуальные и текстовые источники.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-800/10 bg-white/95 p-5 shadow-panel sm:p-6">
          <h2 className="text-3xl font-semibold text-ink">Проверка данных</h2>
          <p className="mt-2 text-base leading-relaxed text-slate-700">
            Для каждой фотографии фиксируются архив, авторство, лицензия и
            ссылка на публикацию. Материалы получают статус «проверено
            редактором» после сверки метаданных и контекста снимка.
          </p>
        </article>
      </div>
    </section>
  );
}
