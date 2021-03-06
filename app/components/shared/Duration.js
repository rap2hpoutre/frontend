// @flow

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import 'intersection-observer';
import VisibilityObserver from 'react-intersection-observer';
import { second } from 'metrick/duration';
import moment from 'moment';
import { getDuration, getDurationString } from '../../lib/date';

type Props = {
  from?: (moment$Moment | string | number | Date | number[]),
  to?: (moment$Moment | string | number | Date | number[]),
  className?: string,
  tabularNumerals: boolean,
  format: getDurationString.formats,
  updateFrequency?: number
};

type State = {
  seconds?: number
};

// Grab a copy of the Moment constructor so we can test PropTypes
const Moment = moment().constructor;

class Duration extends React.PureComponent<Props, State> {
  static propTypes = {
    from: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
      PropTypes.instanceOf(Moment)
    ]),
    to: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
      PropTypes.instanceOf(Moment)
    ]),
    className: PropTypes.string,
    tabularNumerals: PropTypes.bool.isRequired,
    format: PropTypes.oneOf(getDurationString.formats),
    updateFrequency: PropTypes.number
  };

  static defaultProps = {
    updateFrequency: second.bind(1),
    tabularNumerals: true
  };

  _timeout: TimeoutID;

  state = {};

  tick() {
    const { from, to } = this.props;

    this.setState({
      seconds: getDuration(from, to).asSeconds()
    }, () => {
      this.maybeScheduleTick();
    });
  }

  componentDidMount() {
    this.maybeScheduleTick();
  }

  maybeScheduleTick() {
    const { from, to, updateFrequency } = this.props;

    // We only want to schedule ticks if our duration is indeterminate,
    // and our update frequency isn't zero
    if (!(from && to) && typeof updateFrequency == 'number' && updateFrequency > 0) {
      this._timeout = setTimeout(() => this.tick(), updateFrequency);
    }
  }

  maybeCancelTick() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
  }

  componentWillUnmount() {
    this.maybeCancelTick();
  }

  static getDerivedStateFromProps(nextProps, currentState) {
    const seconds = getDuration(nextProps.from, nextProps.to).asSeconds();

    if (seconds !== currentState.seconds) {
      return { seconds };
    }

    return null;
  }

  componentDidUpdate(prevProps) {
    const { updateFrequency, to } = this.props;

    if (updateFrequency !== prevProps.updateFrequency || to !== prevProps.to) {
      this.maybeCancelTick();
      this.maybeScheduleTick();
    }
  }

  handleVisibilityChange = (visible) => {
    this.maybeCancelTick();

    if (visible) {
      this.tick();
    }
  }

  render() {
    const spanClassName = classNames(
      this.props.className,
      { 'tabular-numerals': this.props.tabularNumerals }
    );

    const durationString = getDurationString(this.state.seconds, this.props.format);

    if (this.props.to) {
      return (
        <span className={spanClassName}>
          {durationString}
        </span>
      );
    }

    return (
      <VisibilityObserver
        tag="span"
        className={spanClassName}
        onChange={this.handleVisibilityChange}
      >
        {durationString}
      </VisibilityObserver>
    );
  }
}

const exported = {};

getDurationString.formats.forEach((format) => {
  const componentName = format.charAt(0).toUpperCase() + format.slice(1);

  const component = (props) => <Duration {...props} format={format} />;
  component.displayName = `Duration.${componentName}`;

  exported[componentName] = component;
});

export default exported;
