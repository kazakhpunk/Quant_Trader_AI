const stats = [
  {
    quantity: "450+",
    description: "Stocks",
  },
  {
    quantity: "550+",
    description: "Users",
  },
  {
    quantity: "50+",
    description: "Countries",
  },
  {
    quantity: "6",
    description: "Continents",
  },
];

const Statistics = () => {
  return (
    <section id="statistics">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map(({ quantity, description }) => (
          <div key={description} className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">{quantity}</h2>
            <p className="text-xl text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Statistics;
