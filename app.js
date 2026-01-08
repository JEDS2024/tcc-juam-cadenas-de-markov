const MarkovChain = require('./markov');

const exampleText = `
Las simulaciones realistas son cruciales para el avance científico. 
Modelan sistemas complejos con alta fidelidad. 
La física cuántica y la dinámica de fluidos se benefician enormemente. 
Los algoritmos de Monte Carlo son fundamentales en muchas simulaciones. 
La validación de modelos es un paso esencial. 
Grandes supercomputadoras ejecutan estas simulaciones. 
El comportamiento emergente es una característica común. 
La inteligencia artificial mejora la eficiencia de las simulaciones. 
Los gemelos digitales replican sistemas físicos en tiempo real. 
La incertidumbre es inherente a cualquier modelo. 
Optimizar parámetros es un desafío constante. 
Visualizar los resultados ayuda a la comprensión. 
Las simulaciones de tráfico optimizan el flujo urbano. 
La predicción climática depende de modelos complejos. 
La medicina personalizada utiliza simulaciones biológicas. 
La exploración espacial se basa en simulaciones de trayectoria. 
La seguridad de sistemas críticos se verifica con simulaciones. 
La realidad virtual ofrece nuevas formas de interactuar con simulaciones. 
El aprendizaje automático acelera el análisis de datos de simulación. 
La computación de alto rendimiento es indispensable. 
`;

const markov = new MarkovChain();
markov.train(exampleText);

console.log("Generando texto sobre simulaciones realistas:\n");
for (let i = 0; i < 5; i++) {
    console.log(`- ${markov.generate(15)}.`);
}
