const generatedTextElem = document.getElementById('generatedText');
const simulationChartCtx = document.getElementById('simulationChart').getContext('2d');
const variableNameInput = document.getElementById('variableName');
const variablePercentageInput = document.getElementById('variablePercentage');
const addVariableBtn = document.getElementById('addVariableBtn');
const variableListElem = document.getElementById('variableList');
const simulationDurationInput = document.getElementById('simulationDuration');

const startAutoBtn = document.getElementById('startAutoBtn');
const stepBtn = document.getElementById('stepBtn');
const stopBtn = document.getElementById('stopBtn');
const currentWinnerElem = document.getElementById('currentWinner');
const comparisonStatsElem = document.getElementById('comparisonStats');

const chartTypeSelector = document.getElementById('chartTypeSelector');
const normalizeImpactsCheckbox = document.getElementById('normalizeImpacts');

let variables = [];
let simulationChart;
let isSimulationRunning = false;
let simulationInterval = null;
let currentChartData = { mainResult: [], variableImpacts: {} };
let simulationStep = 0;
let currentSimulationValue = 100;
let editingIndex = null;
let simulationLimit = null;
let winningVariablesHistory = [];

// Función para generar colores HSL perceptualmente distintos
function generateDistinctColor(index, totalColors) {
    const hue = (index * (360 / totalColors)) % 360;
    const saturation = 90; // Alta saturación para colores fuertes
    const lightness = 60;  // Luminosidad media para buen contraste en fondo oscuro
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Función para actualizar la lista de variables en la UI
function updateVariableList() {
    variableListElem.innerHTML = '';
    if (variables.length === 0) {
        variableListElem.innerHTML = '<p class="text-gray-400">No hay variables añadidas aún.</p>';
        return;
    }

    // Reasignar colores para asegurar la máxima distinción si el número de variables ha cambiado
    variables.forEach((v, index) => {
        v.color = generateDistinctColor(index, variables.length);
    });

    variables.forEach((v, index) => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center bg-gray-600 p-2 rounded mb-1';
        item.innerHTML = `
            <span class="text-gray-200">${v.name} (${v.percentage}%)</span>
            <div>
                <button class="edit-variable-btn bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold py-1 px-2 rounded mr-2" data-index="${index}">Editar</button>
                <button class="remove-variable-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded" data-index="${index}">Eliminar</button>
            </div>
        `;
        variableListElem.appendChild(item);
    });

    document.querySelectorAll('.remove-variable-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            variables.splice(index, 1);
            updateVariableList(); // Re-renderizar y reasignar colores
            resetSimulation();
            updateChart();
        });
    });

    document.querySelectorAll('.edit-variable-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const variableToEdit = variables[index];
            variableNameInput.value = variableToEdit.name;
            variablePercentageInput.value = variableToEdit.percentage;
            editingIndex = index;
            addVariableBtn.textContent = 'Actualizar Variable';
        });
    });
}

// Evento para añadir/actualizar variable
addVariableBtn.addEventListener('click', () => {
    const name = variableNameInput.value.trim();
    const percentage = parseInt(variablePercentageInput.value);

    if (name && !isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        let newTotalPercentage = variables.reduce((sum, v) => sum + v.percentage, 0);

        if (editingIndex !== null) {
            newTotalPercentage -= variables[editingIndex].percentage;
        }

        newTotalPercentage += percentage;

        if (newTotalPercentage > 100) {
            alert(`La suma total de porcentajes no puede exceder el 100%. Actualmente es ${newTotalPercentage - percentage}%.`);
            return;
        }

        if (editingIndex !== null) {
            variables[editingIndex].name = name;
            variables[editingIndex].percentage = percentage;
            // El color se reasignará en updateVariableList
            editingIndex = null;
            addVariableBtn.textContent = 'Añadir Variable';
        } else {
            variables.push({ name, percentage, color: '' }); // Color temporal, se asignará en updateVariableList
        }
        variableNameInput.value = '';
        variablePercentageInput.value = '';
        updateVariableList(); // Esto reasigna los colores
        resetSimulation();
        updateChart();
    } else {
        alert('Por favor, introduce un nombre y un porcentaje válido (0-100).');
    }
});

// Función para ejecutar un solo paso de la simulación
function runSimulationStep() {
    if (variables.length === 0) {
        generatedTextElem.textContent = "Por favor, añade variables para la simulación.";
        stopSimulation();
        return;
    }

    const totalPercentage = variables.reduce((sum, v) => sum + v.percentage, 0);
    if (totalPercentage === 0) {
        generatedTextElem.textContent = "El porcentaje total de las variables es cero. Añade porcentajes válidos.";
        stopSimulation();
        return;
    }

    const random = Math.random() * totalPercentage;
    let cumulativePercentage = 0;
    let selectedVariable = null;

    for (const v of variables) {
        cumulativePercentage += v.percentage;
        if (random < cumulativePercentage) {
            selectedVariable = v;
            break;
        }
    }

    if (selectedVariable) {
        simulationStep++;
        currentWinnerElem.textContent = selectedVariable.name;
        generatedTextElem.textContent += `${selectedVariable.name} -> `;
        winningVariablesHistory.push(selectedVariable.name); // Guardar historial

        // Actualizar el valor del gráfico principal (ya no se usa en el gráfico, pero se mantiene para lógica si se necesita)
        if (selectedVariable.name.toLowerCase().includes('éxito') || selectedVariable.name.toLowerCase().includes('sube')) {
            currentSimulationValue += Math.random() * 5 + 1;
        } else if (selectedVariable.name.toLowerCase().includes('fallo') || selectedVariable.name.toLowerCase().includes('baja')) {
            currentSimulationValue -= Math.random() * 5 + 1;
        } else {
            currentSimulationValue += (Math.random() - 0.5) * 2;
        }
        currentChartData.mainResult.push(currentSimulationValue > 0 ? currentSimulationValue : 1);

        // Actualizar el impacto acumulativo de cada variable
        variables.forEach(v => {
            const lastImpact = currentChartData.variableImpacts[v.name] ? currentChartData.variableImpacts[v.name][currentChartData.variableImpacts[v.name].length - 1] || 0 : 0;
            if (v.name === selectedVariable.name) {
                currentChartData.variableImpacts[v.name].push(lastImpact + 1); // Incrementa el impacto
            } else {
                currentChartData.variableImpacts[v.name].push(lastImpact); // Mantiene el impacto anterior
            }
        });

        updateChart();

        // Detener la simulación si se alcanza el límite
        if (simulationLimit !== null && simulationStep >= simulationLimit) {
            stopSimulation();
            currentWinnerElem.textContent = `Simulación automática finalizada después de ${simulationLimit} segundos.`;
        }
    }
}

function updateChart() {
    const labels = Array.from({length: simulationStep}, (_, i) => i + 1);
    const chartType = chartTypeSelector.value;
    const normalize = normalizeImpactsCheckbox.checked;

    const datasets = [
        // Eliminado: Valor de Simulación (Resultado Principal)
    ];

    variables.forEach(v => {
        let data = currentChartData.variableImpacts[v.name] || [];
        if (normalize && simulationStep > 0) {
            data = data.map(impact => (impact / simulationStep) * 100); // Normalizar a porcentaje
        }

        datasets.push({
            label: `Impacto Acumulado: ${v.name}`,
            data: data,
            borderColor: v.color,
            backgroundColor: `${v.color.replace('hsl', 'hsla').replace(')', ', 0.7)')}`, // Más opaco para barras
            tension: 0.1,
            fill: chartType === 'bar', // Rellenar si es gráfico de barras
            pointRadius: 0,
            borderWidth: 2,
            type: chartType === 'bar' ? 'bar' : 'line',
            yAxisID: chartType === 'bar' ? 'y-bar' : 'y',
        });
    });

    const scales = {
        x: {
            grid: {
                color: '#4b5563'
            },
            ticks: {
                color: '#cbd5e1'
            }
        },
        y: {
            grid: {
                color: '#4b5563'
            },
            ticks: {
                color: '#cbd5e1'
            },
            min: 0,
            max: normalize ? 100 : (simulationStep > 0 ? simulationStep * 1.1 : 10),
        }
    };

    if (chartType === 'bar') {
        scales['y-bar'] = {
            grid: {
                color: '#4b5563'
            },
            ticks: {
                color: '#cbd5e1'
            },
            min: 0,
            max: normalize ? 100 : (simulationStep > 0 ? simulationStep * 1.1 : 10),
            position: 'right',
        };
    }

    const options = {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: '#cbd5e1'
                },
                onClick: (e, legendItem, legend) => {
                    const index = legendItem.datasetIndex;
                    const ci = legend.chart;
                    if (ci.isDatasetVisible(index)) {
                        ci.hide(index);
                        legendItem.hidden = true;
                    } else {
                        ci.show(index);
                        legendItem.hidden = false;
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += normalize ? `${context.parsed.y.toFixed(2)}%` : context.parsed.y;
                        }
                        return label;
                    },
                    title: function(context) {
                        const step = context[0].label;
                        const winningVar = winningVariablesHistory[step - 1];
                        return `Paso: ${step} (Ganador: ${winningVar || 'N/A'})`;
                    }
                }
            },
        },
        scales: scales
    };

    if (simulationChart) {
        simulationChart.data.labels = labels;
        simulationChart.data.datasets = datasets;
        simulationChart.options = options;
        simulationChart.update();
    } else {
        simulationChart = new Chart(simulationChartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: options
        });
    }
}

function resetSimulation() {
    generatedTextElem.textContent = "";
    currentChartData = { mainResult: [], variableImpacts: {} };
    variables.forEach(v => {
        currentChartData.variableImpacts[v.name] = [];
    });
    simulationStep = 0;
    currentSimulationValue = 100;
    currentWinnerElem.textContent = "Esperando simulación...";
    if (simulationChart) {
        simulationChart.destroy();
        simulationChart = null;
    }
    comparisonStatsElem.innerHTML = '';
    simulationLimit = null;
    winningVariablesHistory = [];
}

function startSimulation() {
    if (isSimulationRunning) return;
    isSimulationRunning = true;
    startAutoBtn.disabled = true;
    stepBtn.disabled = true;
    stopBtn.disabled = false;

    resetSimulation();

    const durationValue = simulationDurationInput.value.trim();
    if (durationValue !== '' && !isNaN(parseInt(durationValue))) {
        simulationLimit = parseInt(durationValue);
    } else {
        simulationLimit = null;
    }

    updateChart();
}

function stopSimulation() {
    isSimulationRunning = false;
    clearInterval(simulationInterval);
    simulationInterval = null;
    startAutoBtn.disabled = false;
    stepBtn.disabled = false;
    stopBtn.disabled = true;
    currentWinnerElem.textContent = "Simulación detenida.";

    displayComparisonStats();
}

function displayComparisonStats() {
    let statsHtml = '<h3 class="text-xl font-semibold text-blue-300 mb-2">Estadísticos de Comparación:</h3>';
    if (variables.length === 0 || simulationStep === 0) {
        statsHtml += '<p class="text-gray-400">No hay datos para comparar.</p>';
    } else {
        variables.forEach(v => {
            const finalImpact = currentChartData.variableImpacts[v.name][currentChartData.variableImpacts[v.name].length - 1] || 0;
            const percentageOfTotalSteps = (finalImpact / simulationStep * 100).toFixed(2);
            const averageImpactPerStep = (finalImpact / simulationStep).toFixed(4);

            statsHtml += `<p class="text-gray-200">${v.name}: Impacto acumulado = ${finalImpact} (${percentageOfTotalSteps}% de los pasos), Impacto promedio/paso = ${averageImpactPerStep}</p>`;
        });
    }
    comparisonStatsElem.innerHTML = statsHtml;
}

startAutoBtn.addEventListener('click', () => {
    startSimulation();
    simulationInterval = setInterval(runSimulationStep, 1000);
});

stepBtn.addEventListener('click', () => {
    if (!isSimulationRunning) {
        resetSimulation();
        updateChart();
    }
    isSimulationRunning = true;
    startAutoBtn.disabled = true;
    stopBtn.disabled = false;
    runSimulationStep();
    displayComparisonStats();
});

stopBtn.addEventListener('click', stopSimulation);

chartTypeSelector.addEventListener('change', updateChart);
normalizeImpactsCheckbox.addEventListener('change', updateChart);

// Inicializar la lista de variables y el gráfico al cargar
updateVariableList();
resetSimulation();
updateChart();