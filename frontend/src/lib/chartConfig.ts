import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Global dark theme configuration
ChartJS.defaults.color = '#E5E7EB'; // Light gray text
ChartJS.defaults.borderColor = 'rgba(55, 65, 81, 0.3)'; // Dark gray borders
ChartJS.defaults.backgroundColor = 'rgba(17, 24, 39, 0.8)'; // Dark background

// Configure default plugins
ChartJS.defaults.plugins.legend.labels.color = '#E5E7EB';
ChartJS.defaults.plugins.title.color = '#F9FAFB';
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 24, 39, 0.95)';
ChartJS.defaults.plugins.tooltip.titleColor = '#F9FAFB';
ChartJS.defaults.plugins.tooltip.bodyColor = '#E5E7EB';
ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(55, 65, 81, 0.5)';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;

export default ChartJS; 