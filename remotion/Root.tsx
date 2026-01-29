import { Composition } from 'remotion';
import { LeadershipDemo } from './compositions/LeadershipDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LeadershipDemo"
        component={LeadershipDemo}
        durationInFrames={270} // 9 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Rentokil BI Dashboard',
          subtitle: 'Sales & Operations Intelligence',
        }}
      />
    </>
  );
};
