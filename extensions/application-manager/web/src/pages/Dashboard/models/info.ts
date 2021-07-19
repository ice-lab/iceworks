import callService from '@/callService';

const CLIENT_TOKEN = process && process.env && process.env.CLIENT_TOKEN;

export default {
  state: {
    basic: { name: '-', description: '-', type: '-', framework: '-', path: '-', feedbackLink: '' },
    git: { remoteUrl: '-', branch: '-', isGit: false },
    def: { idpUrl: '-', defUrl: '-', isDef: false },
    inited: false,
  },
  reducers: {
  },
  effects: () => ({
    async refresh() {
      this.setState({ inited: true });
      const [basic, git, def] = await Promise.all([
        await callService('project', 'getProjectBaseInfo'),
        await callService('project', 'getProjectGitInfo'),
        await callService('project', 'getProjectDefInfo', CLIENT_TOKEN),
      ]);
      this.setState({
        basic,
        git,
        def,
      });
    },
  }),
};
