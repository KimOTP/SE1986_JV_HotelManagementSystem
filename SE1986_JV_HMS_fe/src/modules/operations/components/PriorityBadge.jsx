import { Badge } from 'react-bootstrap';
import { getPriority } from '../constants/operationsLabels';

export default function PriorityBadge({ priority }) {
  const definition = getPriority(priority);
  return (
    <Badge bg={definition.color} text={definition.text}>
      {definition.label}
    </Badge>
  );
}
